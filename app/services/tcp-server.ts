import WritableStream = NodeJS.WritableStream;
import { ServicesManager } from '../services-manager';
import { Service } from './service';
import { IFormInput, TFormData } from '../components/shared/forms/Input';
import { mutation } from './stateful-service';
import { Inject } from '../util/injector';
import {
  JsonrpcService,
  E_JSON_RPC_ERROR,
  IJsonRpcEvent,
  IJsonRpcRequest,
  IJsonRpcResponse
} from 'services/jsonrpc';

import { SettingsStorageService } from './settings';

const net = require('net');


const LOCAL_HOST_NAME = '127.0.0.1';
const WILDCARD_HOST_NAME = '0.0.0.0';


interface IClient {
  id: number;
  socket: WritableStream;
  subscriptions: string[];

  /**
   * Clients with listenAllSubscriptions=true receive events that have been sent to other clients.
   * This is helpful for tests.
   */
  listenAllSubscriptions: boolean;
}

interface IServer {
  nativeServer: {
    on(eventName: string, cb: (event: any) => any): any;
  };
  close(): void;
}

export interface ITcpServerServiceAPI {
  listen(): void;
  stopListening(): void;
}

const TCP_PORT = 28194;

export class TcpServerService extends Service implements ITcpServerServiceAPI {

  @Inject() private jsonrpcService: JsonrpcService;
  @Inject() settingsStorageService: SettingsStorageService;

  private servicesManager: ServicesManager = ServicesManager.instance;
  private clients: Dictionary<IClient> = {};
  private nextClientId = 1;
  private servers: IServer[] = [];

  // enable to debug
  private enableLogs = false;

  init() {
    super.init();
    this.servicesManager.serviceEvent.subscribe(event => this.onServiceEventHandler(event));
  }

  listen() {
    const Settings = this.settingsStorageService.state.Settings;
    if (Settings.NamedPipe.Enabled) this.listenConnections(this.createNamedPipeServer());
    if (Settings.TCP.Enabled) this.listenConnections(this.createTcpServer());
    if (Settings.WebSockets.Enabled) this.listenConnections(this.createWebSocketsServer());
  }

  stopListening() {
    this.servers.forEach(server => server.close());
    Object.keys(this.clients).forEach(clientId => this.disconnectClient(Number(clientId)));
  }

  private listenConnections(server: IServer) {
    this.servers.push(server);

    server.nativeServer.on('connection', (socket) => this.onConnectionHandler(socket));

    server.nativeServer.on('error', (error) => {
      throw error;
    });
  }


  private createNamedPipeServer(): IServer {
    console.log('Creating named pipe');
    const settings = this.settingsStorageService.state.Settings;
    const server = net.createServer();
    server.listen('\\\\.\\pipe\\' + settings.NamedPipe.PipeName);
    return {
      nativeServer: server,
      close() {
        server.close();
      }
    };
  }


  private createTcpServer(): IServer {
    console.log('Creating tcp server');
    const server = net.createServer();
    const settings = this.settingsStorageService.state.Settings.TCP;
    server.listen(settings.Port, settings.AllowRemote ? WILDCARD_HOST_NAME : LOCAL_HOST_NAME);
    return {
      nativeServer: server,
      close() {
        server.close();
      }
    };
  }


  private createWebSocketsServer(): IServer {
    console.log('Creating web socket server');
    const settings = this.settingsStorageService.state.Settings.WebSockets;
    const http = require('http');
    const sockjs = require('sockjs');
    const websocketsServer = sockjs.createServer();
    const httpServer = http.createServer();
    websocketsServer.installHandlers(httpServer, { prefix:'/api' });
    httpServer.listen(settings.Port, settings.AllowRemote ? WILDCARD_HOST_NAME : LOCAL_HOST_NAME);
    return {
      nativeServer: websocketsServer,
      close() {
        httpServer.close();
      }
    };
  }


  private onConnectionHandler(socket: WritableStream) {
    this.log('new connection');

    const id = this.nextClientId++;
    const client: IClient = { id, socket, subscriptions: [], listenAllSubscriptions: false };
    this.clients[id] = client;

    socket.on('data', (data: any) => {
      this.onRequestHandler(client, data.toString());
    });

    socket.on('end', () => {
      this.onDisconnectHandler(client);
    });

    socket.on('close', () => {
      this.onDisconnectHandler(client);
    });
  }


  private onRequestHandler(client: IClient, data: string) {
    this.log('tcp request', data);
    const requests = data.split('\n');
    requests.forEach(requestString => {
      if (!requestString) return;
      try {
        const request: IJsonRpcRequest = JSON.parse(requestString);

        const errorMessage = this.validateRequest(request);

        if (errorMessage) {
          const errorResponse = this.jsonrpcService.createError(request, {
            code: E_JSON_RPC_ERROR.INVALID_PARAMS,
            message: errorMessage
          });
          this.sendResponse(client, errorResponse);
          return;
        }

        // some requests have to be handled by TcpServerService
        if (this.hadleTcpServerDirectives(client, request)) return;

        const response = this.servicesManager.executeServiceRequest(request);

        // if response is subscription then add this subscription to client
        if (response.result && response.result._type === 'SUBSCRIPTION') {
          const subscriptionId = response.result.resourceId;
          if (!client.subscriptions.includes(subscriptionId)) {
            client.subscriptions.push(subscriptionId);
          }
        }

        this.sendResponse(client, response);
      } catch (e) {
        this.sendResponse(
          client,
          this.jsonrpcService.createError(null,{
            code: E_JSON_RPC_ERROR.INVALID_REQUEST,
            message: 'Make sure that the request is valid json. ' +
            'If request string contains multiple requests, ensure requests are separated ' +
            'by a single newline character LF ( ASCII code 10)'
          }));
      }
    });
  }


  private onServiceEventHandler(event: IJsonRpcResponse<IJsonRpcEvent>) {
    // send event to subscribed clients
    Object.keys(this.clients).forEach(clientId => {
      const client = this.clients[clientId];
      const needToSendEvent = client.listenAllSubscriptions || client.subscriptions.includes(event.result.resourceId);
      if (needToSendEvent) this.sendResponse(client, event);
    });
  }


  private validateRequest(request: IJsonRpcRequest): string {
    let message = '';
    if (!request.id) message += ' id is required;';
    if (!request.params) message += ' params is required;';
    if (request.params && !request.params.resource) message += ' resource is required;';
    return message;
  }


  private hadleTcpServerDirectives(client: IClient, request: IJsonRpcRequest) {

    // handle unsubscribing by clearing client subscriptions
    if (
      request.method === 'unsubscribe' &&
      this.servicesManager.subscriptions[request.params.resource]
    ) {
      const subscriptionInd = client.subscriptions.indexOf(request.params.resource);
      if (subscriptionInd !== -1) client.subscriptions.splice(subscriptionInd, 1);
      this.sendResponse(client,{
        jsonrpc: '2.0',
        id: request.id,
        result: subscriptionInd !== -1
      });
      return true;
    }

    // handle `listenAllSubscriptions` directive
    if (
      request.method === 'listenAllSubscriptions' &&
      request.params.resource === 'TcpServerService'
    ) {
      client.listenAllSubscriptions = true;
      this.sendResponse(client,{
        jsonrpc: '2.0',
        id: request.id,
        result: true
      });
      return true;
    }
  }


  private onDisconnectHandler(client: IClient) {
    this.log('client disconnected');
    delete this.clients[client.id];
  }


  private sendResponse(client: IClient, response: IJsonRpcResponse<any>) {
    this.log('send response', response);
    client.socket.write(JSON.stringify(response) + '\n');
  }

  private disconnectClient(clientId: number) {
    const client = this.clients[clientId];
    client.socket.end();
    delete this.clients[clientId];
  }

  private log(...messages: any[]) {
    if (!this.enableLogs) return;
    console.log(...messages);
  }
}
