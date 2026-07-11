# Center Stand

로그인 없이 브라우저에서 바로 실행되는 Phaser 기반 2D 중앙 방어 게임입니다. 플레이어는 화면 중앙에 고정되고, 사방에서 몰려오는 적을 자동 공격하며 골드로 여섯 능력을 강화합니다.

## 주요 기능

- 역할과 공격 방식이 다른 캐릭터 6종
- 단일·다중·근접 범위·마법 범위·관통·연쇄 공격
- 최대 99레벨의 원클릭 업그레이드 6종
- 스테이지 1~100, 무한 부활과 완주 결과 공유
- 적·투사체·피해 숫자·이펙트 오브젝트 풀링
- 반복 BGM, 업그레이드 효과음과 시각 피드백
- 데스크톱·모바일 반응형 실행

## 로컬 실행

```bash
npm install
npm run dev
```

## 검사

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

대상 탐색 성능 비교는 다음 명령으로 재현할 수 있습니다.

```bash
npm run benchmark:targeting
```

## GitHub 작업 흐름

- 기능 작업은 별도 브랜치에서 진행합니다.
- pull request에서는 타입 검사, 린트, 단위 테스트, 빌드를 자동 실행합니다.
- `main`에 반영된 변경은 동일 검사를 다시 통과한 뒤 GitHub Pages에 배포됩니다.
- `.env`와 비밀키는 커밋하지 않습니다.

## AI 에이전트 문서

- `AGENTS.md`: 작업 규칙
- `TASKS.md`: 작업 목록과 완료 조건
- `PROJECT_STATUS.md`: 현재 구현·미구현·검사 상태
- `CHANGELOG.md`: 변경 이력

## 기술 스택

Phaser, TypeScript, Vite, Vitest, Playwright, GitHub Actions, GitHub Pages
