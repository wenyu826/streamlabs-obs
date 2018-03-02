import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import { IPathInputValue, Input } from './Input';
import electron from 'electron';
import OpenDialogOptions = Electron.OpenDialogOptions;
import { EPropertyType, EPathType } from 'services/obs-api';

@Component
class PathInput extends Input<IPathInputValue> {

  @Prop()
  value: IPathInputValue;


  $refs: {
    input: HTMLInputElement
  };


  showFileDialog() {
    const options: OpenDialogOptions = {
      defaultPath: this.value.value,
      filters: this.value.filters,
      properties: []
    };

    if (this.value.subType === EPathType.File) {
      options.properties.push('openFile');
    }

    if (this.value.subType === EPathType.Directory) {
      options.properties.push('openDirectory');
    }

    const paths = electron.remote.dialog.showOpenDialog(options);

    if (paths) {
      this.$refs.input.value = paths[0];
      this.handleChange();
    }
  }


  handleChange() {
    this.emitInput({ ...this.value, value: this.$refs.input.value });
  }

}

export default PathInput;
