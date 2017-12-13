import { ICommandDefinition } from 'services/undo';
import { ITransform, SceneItem, ScenesService } from 'services/scenes';

interface ITransformData {
  sceneItemId: string;
  before: ITransform;
  after: ITransform;
}

export const TransformCommand: ICommandDefinition<ITransformData> = {

  wrap(item: SceneItem, args: any[], execute) {
    return {
      sceneItemId: item.sceneItemId,
      before: item.getTransform(),
      after: item.getTransform()
    };
  },

  undo() {

  },

  redo() {

  }

};
