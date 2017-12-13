import { StatefulService } from 'services/stateful-service';
import { SceneItem, ITransform } from 'services/scenes';


interface IHistoryEntry {
  next: IHistoryEntry;
  commands: IHistoryCommand[];
}

enum EObjectType {
  SceneItem = 'scene-item'
}

enum ECommand {
  Transform = 'transform'
}

/**
 * Represents information about a single command that
 * can be executed and rolled back.
 */
interface IHistoryCommand {
  objectType: EObjectType;
  objectId: string;
  command: ECommand;
  beforeData: any;
  afterData: any;
}

export interface ICommandDefinition<TData> {
  /**
   * Should wrap the actual action, and record any
   * before/after states or information about the
   * object in a serializable way
   */
  wrap(object: any, args: any[], execute: () => void): TData;

  /**
   * Should undo this operation
   */
  undo(data: TData): void;

  /**
   * Should redo this operation
   */
  redo(data: TData): void;
}

class TransformCommand {

  constructor() {

  }

  commit() {

  }

}

const definitions = {
  [ECommand.Transform]: {
    getBeforeData(sceneItem: SceneItem, transform: Partial<ITransform>): ITransform {

    },

    getAfterData(sceneItem: SceneItem, transform: Partial<ITransform>): ITransform {

    }
  }
};

/**
 * Information that the UI needs to know about goes in here
 */
interface IUndoState {
  undo: {
    isAvailable: boolean;
    commandDescription: string;
  };

  redo: {
    isAvailable: boolean;
    commandDescription: string;
  };
}


export class UndoService extends StatefulService<IUndoState> {

  private recording = true;
  private manualGrouping = false;


}
