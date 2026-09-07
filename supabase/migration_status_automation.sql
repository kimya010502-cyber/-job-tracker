-- 전형 상태 체계 개편 + 자동 상태 전환용 마이그레이션
-- 이미 schema.sql을 실행해서 운영 중인 프로젝트에서 실행하세요. (Supabase SQL Editor)
-- 기존 데이터는 건드리지 않습니다 — 상태값 변환은 앱이 로그인 시 자동으로 처리합니다.

alter table public.stages add column if not exists stage_type text;
alter table public.stages add column if not exists status_changed_at timestamptz;
alter table public.stages add column if not exists status_change_source text;
