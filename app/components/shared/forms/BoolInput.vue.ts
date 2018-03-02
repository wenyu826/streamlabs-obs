import { Component, Prop } from 'vue-property-decorator';
import { Input, IFormInput } from './Input';

@Component
class BoolInput extends Input<IFormInput<boolean>> {

  @Prop()
  value: IFormInput<boolean>;

  handleClick() {
    if (this.value.enabled === false) return;
    this.emitInput({ ...this.value, value: !this.value.value });
  }

}

export default BoolInput;
