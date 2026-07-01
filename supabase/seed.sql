-- ===================================================================
-- COZAMA 샘플 데이터 (schema.sql 적용 후 실행)
-- 이미지 경로는 GitHub Pages로 배포되는 사이트 루트 기준 상대경로다.
-- ===================================================================

insert into products (product_code, name, price, category, is_new, is_best, description, thumbnail_main, thumbnail_hover, detail_images)
values
  ('na001', '코자마 시그니처 카라 잠옷세트 (60수)', 89000, 'women', true, false,
   '침대 위 포근함 그대로, 문밖을 나서는 단정함을 입다. 60수 코튼 소재로 사계절 부담없이 착용 가능합니다.',
   'img/main/newArrivals_item001.jpg', 'img/main/newArrivals_item001_hover.jpg',
   array['img/main/newArrivals_item001.jpg','img/main/newArrivals_item001_hover.jpg']),

  ('na002', '데일리 라운지 팬츠', 45000, 'women', true, false,
   '부드러운 촉감의 데일리 라운지 팬츠. 허리 밴딩으로 편안한 착용감을 제공합니다.',
   'img/main/newArrivals_item002.jpg', 'img/main/newArrivals_item002_hover.jpg',
   array['img/main/newArrivals_item002.jpg','img/main/newArrivals_item002_hover.jpg']),

  ('na003', '모달 반팔 홈웨어 세트', 69000, 'men', true, false,
   '모달 소재 특유의 부드러운 촉감과 통기성으로 하루 종일 편안합니다.',
   'img/main/newArrivals_item003.jpg', 'img/main/newArrivals_item003_hover.jpg',
   array['img/main/newArrivals_item003.jpg','img/main/newArrivals_item003_hover.jpg']),

  ('na004', '스트라이프 카디건 가운', 79000, 'men', true, false,
   '가볍게 걸치기 좋은 스트라이프 카디건 가운. 집 앞 외출에도 단정합니다.',
   'img/main/newArrivals_item004.jpg', 'img/main/newArrivals_item004_hover.jpg',
   array['img/main/newArrivals_item004.jpg','img/main/newArrivals_item004_hover.jpg']),

  ('na005', '안나케 스크런치 연민트 (60수)', 16000, 'women', true, false,
   '코자마 소재로 제작한 스크런치. 홈웨어 세트와 함께 코디하기 좋습니다.',
   'img/main/newArrivals_item005.jpg', 'img/main/newArrivals_item005_hover.jpg',
   array['img/main/newArrivals_item005.jpg','img/main/newArrivals_item005_hover.jpg']),

  ('bi001', '앤의 조각보 반팔 여성페어 베이지(40수)', 79000, 'women', false, true,
   '40수 코튼 소재의 반팔 여성 홈웨어. 베이지 컬러로 어디에나 잘 어울립니다.',
   'img/main/best_items_img001.jpg', null,
   array['img/main/best_items_img001.jpg']),

  ('bi002', '코튼 셔츠 카라 원피스 잠옷', 92000, 'women', false, true,
   '셔츠 카라 디자인으로 단정하게 연출되는 원피스형 잠옷입니다.',
   'img/main/best_items_img002.jpg', null,
   array['img/main/best_items_img002.jpg']),

  ('bi003', '모달 라운지 투피스', 68000, 'men', false, true,
   '모달 소재의 부드러운 촉감이 돋보이는 라운지 투피스 세트.',
   'img/main/best_items_img003.jpg', null,
   array['img/main/best_items_img003.jpg']),

  ('bi004', '프리미엄 카디건 가운 세트', 118000, 'men', false, true,
   '고급스러운 텍스처의 프리미엄 카디건 가운 세트.',
   'img/main/best_items_img004.png', null,
   array['img/main/best_items_img004.png']),

  ('bi005', '베이직 크루넥 홈웨어 세트', 58000, 'women', false, true,
   '군더더기 없는 디자인의 베이직 크루넥 홈웨어 세트.',
   'img/main/best_items_img005.png', null,
   array['img/main/best_items_img005.png']),

  ('bi006', '스트라이프 반팔 파자마', 65000, 'men', false, true,
   '클래식한 스트라이프 패턴의 반팔 파자마.',
   'img/main/best_items_img006.jpg', null,
   array['img/main/best_items_img006.jpg'])

on conflict (product_code) do nothing;

insert into notices (title, content, is_pinned)
values ('[공지] 코자마 홈페이지가 새롭게 오픈했습니다.',
  '안녕하세요, 코자마입니다.
코자마 공식 홈페이지가 새롭게 오픈했습니다. 앞으로 편안하고 단정한 홈웨어로 고객님의 일상을 채워드리겠습니다.
많은 관심 부탁드립니다.', true)
on conflict do nothing;
