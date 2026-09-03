import { InputService } from '../input/InputService';
import { LifecycleService } from './LifecycleService';
import { TimeService } from './TimeService';

export interface AppServices {
  input: InputService;
  lifecycle: LifecycleService;
  time: TimeService;
}

export const createAppServices = (): AppServices => {
  const time = new TimeService();
  const input = new InputService();

  return {
    time,
    input,
    lifecycle: new LifecycleService(time, input),
  };
};
