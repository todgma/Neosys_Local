-- 네오시스 로컬(라이트) 버전 관리 테이블 — 서버(운영 PostgreSQL 10)에서 관리자가 직접 실행한다.
-- 기존 app_version(원본 Electron 프로그램용)과 같은 구조. 로컬 앱은 GET /api/version/light/latest 로 조회한다(docs/server/APP_VERSION_LIGHT.md).
-- 주의: CREATE TABLE ... (LIKE app_version INCLUDING ALL)은 version_id 기본값이 app_version의 시퀀스를 같이 쓰게 되므로 쓰지 않는다.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_version_light (
    version_id    BIGSERIAL    PRIMARY KEY,                 -- 자체 시퀀스 app_version_light_version_id_seq
    platform      VARCHAR(20)  NOT NULL DEFAULT 'win',
    version       VARCHAR(20)  NOT NULL,                    -- 예: 0.2.0 (로컬 앱 csproj <Version>과 같은 형식)
    download_url  TEXT         NOT NULL,                    -- 새 NeosysLight.exe를 바로 받을 수 있는 주소(https)
    mandatory_yn  CHAR(1)      NOT NULL DEFAULT 'N',        -- 'Y'면 업데이트를 건너뛸 수 없다
    release_note  TEXT,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,       -- FALSE면 배포 중지(조회에서 빠짐)
    reg_dt        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_app_version_light_latest
    ON public.app_version_light (platform, is_active, reg_dt DESC);

COMMENT ON TABLE  public.app_version_light IS '네오시스 로컬(라이트, WPF 단일 exe) 프로그램 버전';
COMMENT ON COLUMN public.app_version_light.download_url IS '새 NeosysLight.exe 다운로드 주소';
COMMENT ON COLUMN public.app_version_light.mandatory_yn IS 'Y=필수 업데이트';

-- API 계정 권한이 테이블별로 나뉘어 있으면 app_version과 같게 맞춘다(필요할 때만, 계정 이름 확인 후).
-- GRANT SELECT ON public.app_version_light TO <api 계정>;

COMMIT;

-- ── 새 버전 배포 예시(새 exe를 올린 뒤) ──
-- INSERT INTO public.app_version_light (platform, version, download_url, mandatory_yn, release_note)
-- VALUES ('win', '0.2.0', 'https://<파일 주소>/Neosys-0.2.0.exe', 'N', '커뮤니티 글쓰기, 일정 끌어다 놓기');
--
-- ── 잘못 올린 버전 회수 ──
-- UPDATE public.app_version_light SET is_active = FALSE WHERE version = '0.2.0';
