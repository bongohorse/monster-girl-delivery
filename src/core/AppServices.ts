import { FlightTuningConfig } from '../config/FlightTuningConfig';
import { RunMotionConfig } from '../config/RunMotionConfig';
import { InputService } from '../input/InputService';
import { LifecycleService } from './LifecycleService';
import { TimeService } from './TimeService';

export interface AppServices {
  flightTuning: FlightTuningConfig;
  input: InputService;
  lifecycle: LifecycleService;
  runMotion: RunMotionConfig;
  time: TimeService;
}

export const createAppServices = (): AppServices => {
  const time = new TimeService();
  const input = new InputService();

  return {
    flightTuning: new FlightTuningConfig(),
    runMotion: new RunMotionConfig(),
    time,
    input,
    lifecycle: new LifecycleService(time, input),
  };
};
