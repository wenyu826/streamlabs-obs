import { Component, Prop } from 'vue-property-decorator';
import { IFormInput, Input } from './Input';

@Component
class NumberInput extends Input<IFormInput<number>> {

  @Prop()
  value: IFormInput<number>;

  $refs: {
    input: HTMLInputElement
  };

  updateValue(value: string) {
    let formattedValue = value;
    if (isNaN(Number(formattedValue))) formattedValue = '0';
    if (formattedValue !== value) {
      this.$refs.input.value = formattedValue;
    }
    // Emit the number value through the input event
    this.emitInput({ ...this.value, value: Number(formattedValue) });
  }

}

export default NumberInput;
