# Center Stand

로그인 없이 브라우저에서 바로 실행되는 Phaser 기반 2D 중앙 방어 게임입니다. 플레이어는 화면 중앙에 고정되고, 사방에서 몰려오는 적을 자동 공격하며 골드로 여섯 능력을 강화합니다.

- [게임 바로 실행](https://lankgoplay1234.github.io/center-stand/)
- [공개 GitHub 저장소](https://github.com/lankgoplay1234/center-stand)

## 주요 기능

- 역할과 공격 방식이 다른 캐릭터 6종
- 단일·다중·근접 범위·마법 범위·관통·연쇄 공격
- 데이터 기반 고유 능력 구조와 아크 레인저 5타 과충전
- 최대 99레벨의 원클릭 업그레이드 6종
- 스테이지 1~100, 무한 부활과 완주 결과 공유
- 적·투사체·피해 숫자·이펙트 오브젝트 풀링
- 반복 BGM, 업그레이드 효과음과 시각 피드백
- 데스크톱·모바일 반응형 실행

## PC 단축키

| 키 | 기능 |
|---|---|
| Q | 공격력 강화 |
| W | 공격 속도 강화 |
| E | 모든 몹 제거 |
| A | 방어력 강화 |
| S | 최대 체력 강화 |
| D | 공격가능범위 강화 |
| F | 사망 화면에서 부활 |

강화 단축키는 버튼과 같은 골드·최대 레벨 조건을 사용합니다. 사망 중에는 Q/W/A/S/D 강화와 F 부활을 사용할 수 있지만 모든 몹 제거는 사용할 수 없습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 랭킹 서버 실행

서버 없이 실행하면 완주 기록은 현재 브라우저의 `localStorage` TOP 10에 저장됩니다.
공유 랭킹 API를 로컬에서 실행하려면 두 터미널을 사용합니다.

```bash
npm run dev:leaderboard
VITE_LEADERBOARD_API_URL=http://localhost:8787 npm run dev
```

API 상태 확인은 `http://localhost:8787/health`, 랭킹 조회는
`http://localhost:8787/leaderboard`에서 할 수 있습니다. 기록은 기본적으로
`.data/leaderboard.json`에 저장됩니다. 배포 환경에서는 `.env.example`의
`LEADERBOARD_ALLOWED_ORIGIN`을 실제 게임 주소로 설정해야 합니다.

현재 완주 토큰은 로그인 없는 프로토타입용 클라이언트 생성 토큰입니다.
공개 경쟁 랭킹으로 운영하기 전에는 서버가 플레이 세션을 검증하는 서명 방식으로 교체해야 합니다.

## 검사

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
npm run test:e2e:endurance
```

대상 탐색 성능 비교는 다음 명령으로 재현할 수 있습니다.

```bash
npm run benchmark:targeting
```

`test:e2e:endurance`는 모바일 100적 전투를 실제 시간 10분 동안 측정하므로 필요할 때 별도로 실행합니다.

## GitHub 작업 흐름

- 작업 시작 전 `git fetch origin`으로 원격 상태를 갱신합니다.
- 기능 작업은 최신 `origin/main`에서 만든 `agent/<작업명>` 브랜치에서 진행합니다.
- 검사가 끝난 변경은 작업 브랜치에만 push하고 draft pull request로 검토를 요청합니다.
- pull request에서는 타입 검사, 린트, 단위 테스트, 빌드를 자동 실행합니다.
- `main`에 반영된 변경은 동일 검사를 다시 통과한 뒤 GitHub Pages에 배포됩니다.

## 선택적 텔레그램 보고

`.env.example`의 `TELEGRAM_BOT_TOKEN`과 `TELEGRAM_CHAT_ID`를 실행 환경에만 설정하면 `createTelegramReporter`로 작업·빌드·테스트 결과를 전송할 수 있습니다. 값이 없으면 네트워크 요청 없이 안전하게 건너뛰며 토큰은 코드나 오류 메시지에 기록하지 않습니다.
- 강제 push와 `main` 직접 커밋은 하지 않습니다.
- `.env`와 비밀키는 커밋하지 않습니다.

## AI 에이전트 문서

- `AGENTS.md`: 작업 규칙
- `TASKS.md`: 작업 목록과 완료 조건
- `PROJECT_STATUS.md`: 현재 구현·미구현·검사 상태
- `CHANGELOG.md`: 변경 이력

## 기술 스택

Phaser, TypeScript, Vite, Vitest, Playwright, GitHub Actions, GitHub Pages
