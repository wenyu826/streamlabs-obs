import { Component, Prop } from 'vue-property-decorator';
import { Input, IFormInput } from './Input';

@Component
class ButtonInput extends Input<IFormInput<boolean>> {

  @Prop()
  value: IFormInput<boolean>;

  handleClick() {
    this.emitInput({ ...this.value, value: true });
  }

}

export default ButtonInput;
