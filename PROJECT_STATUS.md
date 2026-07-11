# Project Status

## 현재 구현된 기능

- Phaser + TypeScript + Vite 실행 기반
- 6개 캐릭터 선택, 단일 화면 전투, 무한 부활/캐릭터 재선택
- 중앙 고정 플레이어와 사방 적 생성, 추적, 근접 공격
- attackType 기반 공격 전략 팩토리와 6개 공격 전략
- SINGLE_TARGET, MULTI_TARGET, AREA_MELEE, AREA_MAGIC, PIERCING, CHAIN
- 자동 원거리/근접 범위 공격, 기본/보너스/총 대상 수 구조, 중복 대상 방지
- 캐릭터별 일반/강화/제외 넉백과 화면 밖 안전 경계
- 공격력/공격 속도/대상 수/방어력/최대 체력/특수 강화 99레벨 업그레이드
- 99레벨 MAX 표시·구매 차단과 대상 수 제곱근 완화 성장
- 캐릭터별 초반 강세/안정 성장/후반 성장 프로필과 6개 업그레이드 효율 배율
- 골드, 체력, 처치, 시간, 스테이지 HUD
- 사망 횟수 HUD와 골드·업그레이드·스테이지 유지 부활
- 부활 후 2초 안전 시간과 캐릭터 선택부터 새 런 시작
- 적/투사체/데미지 텍스트/폭발 이펙트 풀링
- 모든 공격 전략의 실제 적용 피해 숫자와 최대 120개 순환 텍스트 풀
- 스테이지 진행과 체력/공격력/속도/스폰/활성 수 난이도 계산
- 스테이지 1~100 진행, 100스테이지 완주와 사망 횟수 결과
- 완주 결과 1080×1350 PNG 생성, Web Share API 공유와 미지원 브라우저 이미지 저장
- 캐릭터 선택 복귀 후 스테이지·골드·업그레이드·사망 횟수 완전 초기화
- 첫 입력 후 시작되는 절차적 반복 BGM, BGM ON/OFF 버튼과 중복 재생 방지
- 성공 업그레이드 전용 `띠링` 효과음과 원형 파동·`LEVEL UP!` 시각 피드백
- 개발 모드 FPS/활성 객체 표시 및 100 적 테스트
- 300개 적 bounded selection/spatial hash 재현 벤치마크와 성능 결정 문서
- localStorage 최고 생존 기록
- 순수 계산 단위 테스트와 텔레그램 보고 인터페이스
- Playwright 데스크톱·모바일 핵심 플레이 스모크 테스트
- 공개 GitHub 저장소와 Actions 기반 품질 검사·GitHub Pages 자동 배포
- GitHub CLI 인증과 원격 `main` 기준 작업 브랜치·draft PR 흐름
- 데이터 기반 특수 능력 계약과 아크 레인저 `아크 과충전` 수직 구현
- 아크 레인저의 5번째 유효 단일 공격 피해 증폭, 전용 파동 효과와 특수 강화 성장
- Pixel 5 모바일 10분·100~140적 장시간 성능 측정과 재현 명령
- 스테이지 종료 시 잔존 적·추적 투사체 무보상 일괄 정리와 800ms 재생성 지연

## 현재 미구현 기능

- 나머지 5개 캐릭터의 고유 특수 능력 구현과 전략별 밸런스 고도화
- 익명 완주 랭킹 API와 1~5자 닉네임 기록 업로드
- 사망 횟수 오름차순 상위 10위 랭킹 UI
- 다종 적, 보스, 스킬, 장비, 캐릭터별 전투 사운드
- 광고, 로그인, 서버 저장, 랭킹, 결제
- 실제 텔레그램 전송과 자동 에이전트 실행
- 고급 그래픽, 정식 배포

## 알려진 문제

- 기본 BGM과 업그레이드음은 브라우저 합성음이며 실제 모바일 기기의 음량·음색 수동 검수가 필요하다.
- 100 적 테스트 버튼과 디버그 HUD는 개발 모드에서만 표시된다.
- `PERF-003` 최종 하위 10% FPS가 27.99로 30 FPS 목표에 미달해 BLOCKED 상태다. 실제 기기 프로파일링 또는 렌더링 정책 결정이 필요하다.
- 실제 Android/iOS 기기의 발열·배터리·GPU 스로틀링은 아직 측정하지 않았다.
- 300개 이동 적에서는 공간 인덱스 재구축 비용이 커 현재 bounded selection을 유지한다.
- Playwright는 로컬 Chromium 설치가 필요하며 최초 실행 시 `npx playwright install chromium`을 실행해야 한다.
- 블레이드 워든 등 나머지 5개 캐릭터의 특수 강화는 기존 공통 사거리·효과 범위 증가를 유지한다.
- 넉백은 현재 즉시 위치 이동 방식이며 향후 애니메이션 보간을 추가로 다듬을 수 있다.
- 온라인 랭킹은 외부 서버·DB와 부정 기록 방지 정책이 필요하므로 구현 전 사용자 승인이 필요하다.
- 일반 사망은 결과 화면으로 이동하지 않으며 기존 GameOverScene은 100스테이지 완주 결과 화면 전환용으로 보존되어 있다.
- 현재 밸런스는 데이터·계산 테스트 기반의 1차 조정이며, 장시간 실제 플레이 지표에 따른 추가 튜닝이 필요하다.
- 현재 스테이지는 각 30초로 고정되어 총 완주 시간이 길다.

## 최근 테스트 결과

- 2026-07-11 `npm install`: 성공, 0 vulnerabilities
- 2026-07-11 `npm run typecheck`: 성공
- 2026-07-11 `npm run lint`: 성공
- 2026-07-11 `npm run test`: 성공, 14 files / 64 tests
- 2026-07-11 `npm run benchmark:targeting`: 성공, 300개 적 2,000회 비교 완료
- 2026-07-11 `npm run build`: 성공
- 2026-07-11 브라우저 검수: 6개 카드 렌더링, AREA_MAGIC/PIERCING/CHAIN 전투 진입, 오류 로그 없음
- 2026-07-11 `npm run test:e2e`: 성공, desktop/mobile 12 tests, BGM·음소거·업그레이드 피드백 포함
- 2026-07-11 GitHub Actions 품질 검사: 성공, typecheck·lint·test·build 통과
- 2026-07-11 GitHub Pages 배포: 성공, 공개 주소에서 캐릭터 선택 화면과 Canvas 렌더링 확인
- 2026-07-12 Git 이력 정리: 원격 `main` 추적 기반 `agent/git-history-sync` 브랜치 생성, 기존 로컬 이력은 백업 브랜치로 보존
- 2026-07-12 `npm run typecheck`, `npm run lint`, `npm run test` 64개, `npm run build`: 모두 성공
- 2026-07-12 `GAME-007`: typecheck·lint·70개 단위 테스트·build 성공, Playwright desktop/mobile 12개 성공
- 2026-07-12 `PERF-002`: Pixel 5 에뮬레이션 600초·120표본 성공, 평균 30.60 FPS·하위 10% 26.84 FPS·최대 140적
- 2026-07-12 `PERF-003` 1차 시도: 활성 적·투사체 배열/카운트 재사용과 UI 변경 감지 적용, 평균 30.26 FPS·하위 10% 26.21 FPS로 목표 미달
- 2026-07-12 `PERF-003` 2차 시도: 플레이어 피격 피해는 모두 유지하고 100ms 단위 시각 피드백 합산, 평균 31.78 FPS·하위 10% 27.99 FPS·최저 27.81 FPS로 개선됐으나 목표 미달
- 2026-07-12 `PERF-003` 회귀 검사: typecheck·lint·76개 단위 테스트·build 성공, Playwright desktop/mobile 12개 성공. 10분 성능 기준만 실패
- 2026-07-12 `STAGE-003`: typecheck·lint·70개 단위 테스트·build 성공, Playwright desktop/mobile 14개 성공

## 다음 추천 작업

1. 스테이지 1~100 총 플레이타임 약 40분 조정 (`BALANCE-002`)
2. 완주 요구 누적 업그레이드 400회 이상 조정 (`BALANCE-003`)
3. 캐릭터별 평균 사망 약 50회 조정 (`BALANCE-004`)
4. 캐릭터별 고유 공격 모션 (`FX-002`)
5. `PERF-003` 재개 전 실제 기기 GPU·발열 프로파일링

## 현재 빌드 상태

- PASS — Vite production build 생성 완료
- PASS — GitHub Actions 품질 검사와 GitHub Pages 배포 완료
- 공개 저장소: https://github.com/lankgoplay1234/center-stand
- 공개 게임: https://lankgoplay1234.github.io/center-stand/
- 참고: Phaser가 포함된 단일 JavaScript 청크가 Vite의 500 kB 권장치를 초과하지만 실행 오류는 아니다.
