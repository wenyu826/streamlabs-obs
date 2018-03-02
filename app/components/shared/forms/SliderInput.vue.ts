import { throttle } from 'lodash-decorators';
import { Component, Prop } from 'vue-property-decorator';
import { Input, ISliderInputValue } from './Input';
import Slider from '../Slider.vue';

@Component({
  components: { Slider }
})
class SliderInput extends Input<ISliderInputValue> {

  @Prop()
  value: ISliderInputValue;

  @throttle(100)
  updateValue(value: number) {
    this.emitInput({ ...this.value, value });
  }

}

export default SliderInput;
