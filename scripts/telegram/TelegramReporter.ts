export type ReportKind =
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'BUILD_SUCCEEDED'
  | 'BUILD_FAILED'
  | 'TEST_RESULT'
  | 'PROJECT_STATUS';

export interface TelegramReport {
  kind: ReportKind;
  title: string;
  summary: string;
  changedFiles?: readonly string[];
  deploymentUrl?: string;
  timestamp: string;
}

export interface TelegramReporter {
  report(message: TelegramReport): Promise<void>;
}

/**
 * 1차 프로토타입용 무전송 구현입니다.
 * 실제 연동 시 환경변수를 읽는 구현체를 별도 파일로 추가하고 이 인터페이스를 구현합니다.
 */
export class NoopTelegramReporter implements TelegramReporter {
  async report(_message: TelegramReport): Promise<void> {
    void _message;
    return Promise.resolve();
  }
}
