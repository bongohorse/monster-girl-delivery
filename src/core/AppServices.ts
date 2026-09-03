import { FlightTuningConfig } from '../config/FlightTuningConfig';
import { InputService } from '../input/InputService';
import { LifecycleService } from './LifecycleService';
import { TimeService } from './TimeService';

export interface AppServices {
  flightTuning: FlightTuningConfig;
  input: InputService;
  lifecycle: LifecycleService;
  time: TimeService;
}

export const createAppServices = (): AppServices => {
  const time = new TimeService();
  const input = new InputService();

  return {
    flightTuning: new FlightTuningConfig(),
    time,
    input,
    lifecycle: new LifecycleService(time, input),
  };
};
