import { SourceCaptureErrorCode } from '../errors/source-capture.error';

export type SourceCaptureResult = Readonly<{
  sourceId: string;
  status: 'completed';
  itemsParsed: number;
}>;

export type FailedSourceCaptureResult = Readonly<{
  sourceId: string;
  status: 'failed';
  errorCode: SourceCaptureErrorCode;
}>;

export type IndividualSourceCaptureResult =
  | SourceCaptureResult
  | FailedSourceCaptureResult;

export type MultipleSourceCaptureResult = Readonly<{
  results: readonly IndividualSourceCaptureResult[];
}>;
