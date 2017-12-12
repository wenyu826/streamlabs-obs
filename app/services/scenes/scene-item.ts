import { ScenesService, Scene, ISceneApi, ISceneItem, ISceneItemApi, ISceneItemInfo, ITransform } from './index';
import { mutation, ServiceHelper } from '../stateful-service';
import Utils from '../utils';
import { Source, SourcesService, TSourceType, ISource } from '../sources';
import { Inject } from '../../util/injector';
import { TFormData } from '../../components/shared/forms/Input';
import * as obs from '../obs-api';
import { updateLocale } from 'moment';


/**
 * A SceneItem is a source that contains
 * all of the information about that source, and
 * how it fits in to the given scene
 */
@ServiceHelper()
export class SceneItem implements ISceneItemApi {

  sourceId: string;
  name: string;
  type: TSourceType;
  audio: boolean;
  video: boolean;
  muted: boolean;
  width: number;
  height: number;
  properties: TFormData;
  channel?: number;

  sceneItemId: string;
  obsSceneItemId: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  visible: boolean;
  crop: ICrop;
  locked: boolean;
  rotation: number;

  // Some computed attributes

  get scaledWidth(): number {
    return this.width * this.scaleX;
  }

  get scaledHeight(): number {
    return this.height * this.scaleY;
  }

  // A visual source is visible in the editor and not locked
  get isVisualSource() {
    return (this.video && (this.width > 0) && (this.height > 0)) && !this.locked;
  }

  sceneItemState: ISceneItem;

  @Inject()
  private scenesService: ScenesService;

  @Inject()
  private sourcesService: SourcesService;

  constructor(private sceneId: string, sceneItemId: string, sourceId: string) {

    const sceneSourceState = this.scenesService.state.scenes[sceneId].items.find(source => {
      return source.sceneItemId === sceneItemId;
    });
    const sourceState = this.sourcesService.state.sources[sourceId];
    this.sceneItemState = sceneSourceState;
    this.sceneId = sceneId;
    Utils.applyProxy(this, sourceState);
    Utils.applyProxy(this, this.sceneItemState);
  }

  getModel(): ISceneItem & ISource {
    return { ...this.sceneItemState, ...this.source.sourceState };
  }

  getScene(): Scene {
    return this.scenesService.getScene(this.sceneId);
  }

  get source() {
    return this.sourcesService.getSource(this.sourceId);
  }

  getSource() {
    return this.source;
  }

  getObsInput() {
    return this.source.getObsInput();
  }

  getObsSceneItem(): obs.ISceneItem {
    return this.getScene().getObsScene().findItem(this.obsSceneItemId);
  }

  remove() {
    this.scenesService.getScene(this.sceneId).removeItem(this.sceneItemId);
  }

  setVisibility(visible: boolean) {
    this.getObsSceneItem().visible = visible;
    this.update({ sceneItemId: this.sceneItemId, visible });
  }

  /**
   * @deprecated Use setTransform instead
   */
  setPosition(vec: IVec2) {
    this.setTransform({ position: vec });
  }

  nudgeLeft() {
    this.setTransform({ position: { x: this.x - 1, y: this.y } });
  }

  nudgeRight() {
    this.setTransform({ position: { x: this.x + 1, y: this.y } });
  }

  nudgeUp() {
    this.setTransform({ position: { x: this.x, y: this.y - 1 } });
  }

  nudgeDown() {
    this.setTransform({ position: { x: this.x, y: this.y + 1 } });
  }

  /**
   * @deprecated Use setTransform instead
   */
  setRotation(rotation: number) {
    this.setTransform({ rotation });
  }

  /**
   * @deprecated Use setTransform instead
   */
  setCrop(crop: ICrop) {
    this.setTransform({ crop });
  }

  /**
   * @deprecated Use setTransform instead
   */
  setPositionAndScale(x: number, y: number, scaleX: number, scaleY: number) {
    this.setTransform({ position: { x, y }, scale: { x: scaleX, y: scaleY } });
  }

  /**
   * @deprecated Use setTransform instead
   */
  setPositionAndCrop(x: number, y: number, crop: ICrop) {
    this.setTransform({ position: { x, y }, crop });
  }

  /**
   * Takes a partial transform and applies it to this scene
   * item.  Any unset attributes on the transform object
   * will not be changed.
   * @param transform a partial transform
   */
  setTransform(transform: Partial<ITransform>) {
    const obsSceneItem = this.getObsSceneItem();
    const updatePatch: Partial<ISceneItem> = {};

    if (transform.position) {
      obsSceneItem.position = transform.position;
      updatePatch.x = transform.position.x;
      updatePatch.y = transform.position.y;
    }

    if (transform.scale) {
      obsSceneItem.scale = transform.scale;
      updatePatch.scaleX = transform.scale.x;
      updatePatch.scaleY = transform.scale.y;
    }

    if (transform.crop) {
      const roundedCrop = {
        top: Math.round(transform.crop.top),
        right: Math.round(transform.crop.right),
        bottom: Math.round(transform.crop.bottom),
        left: Math.round(transform.crop.left)
      };

      obsSceneItem.crop = roundedCrop;
      updatePatch.crop = roundedCrop;
    }

    if (transform.rotation) {
      // Adjusts any positve or negative rotation value into a normalized
      // value between 0 and 360.
      const effectiveRotation = ((transform.rotation % 360) + 360) % 360;

      obsSceneItem.rotation = effectiveRotation;
      updatePatch.rotation = effectiveRotation;
    }

    this.update({ sceneItemId: this.sceneItemId, ...updatePatch });
  }

  /**
   * Returns the transform of this scene item
   */
  getTransform(): ITransform {
    // TODO: Store the transform on the scene-item as-is
    return {
      position: {
        x: this.x,
        y: this.y
      },
      scale: {
        x: this.scaleX,
        y: this.scaleY
      },
      crop: this.crop,
      rotation: this.rotation
    };
  }


  setLocked(locked: boolean) {
    const scene = this.getScene();
    if (locked && (scene.activeItemIds.includes(this.sceneItemId))) {
      scene.makeItemsActive([]);
    }

    this.update({ sceneItemId: this.sceneItemId, locked });
  }


  loadAttributes() {
    const { position, scale, visible, crop } = this.getObsSceneItem();
    this.update({
      sceneItemId: this.sceneItemId,
      scaleX: scale.x,
      scaleY: scale.y,
      visible,
      ...position,
      crop
    });
  }

  loadItemAttributes(customSceneItem: ISceneItemInfo) {
    const visible = customSceneItem.visible;
    const position = { x: customSceneItem.x, y: customSceneItem.y };
    const crop = customSceneItem.crop;

    this.update({
      sceneItemId: this.sceneItemId,
      scaleX: customSceneItem.scaleX,
      scaleY: customSceneItem.scaleY,
      visible,
      ...position,
      crop,
      locked: !!customSceneItem.locked,
      rotation: customSceneItem.rotation
    });
  }


  private update(patch: {sceneItemId: string} & Partial<ISceneItem>) {
    this.UPDATE(patch);
    this.scenesService.itemUpdated.next(this.sceneItemState);
  }


  @mutation()
  private UPDATE(patch: {sceneItemId: string} & Partial<ISceneItem>) {
    Object.assign(this.sceneItemState, patch);
  }
}
