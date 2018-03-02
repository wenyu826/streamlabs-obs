import { Component, Prop } from 'vue-property-decorator';
import { IFormInput, Input } from './Input';

@Component
class TextInput extends Input<IFormInput<string>> {

  @Prop()
  value: IFormInput<string>;

  textVisible = !this.value.masked;


  toggleVisible() {
    this.textVisible = !this.textVisible;
  }

  onInputHandler(event: Event) {
    this.emitInput({ ...this.value, value: event.target['value'] });
  }

}

export default TextInput;
