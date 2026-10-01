# 디자인과 자료 출처

## 디자인 방향

[General Intelligence Company — Refero Styles](https://styles.refero.design/style/34baa524-5d5b-4165-bbab-d01f05e6d6b9)를 참고했습니다. 따뜻한 종이색, 초록빛 회색의 얇은 테두리, 절제된 파란색 아웃라인 버튼, 문학적인 세리프 제목, 회화풍 풍경이라는 디자인 방향을 적용했습니다. 원본 로고·전용 폰트·이미지는 복사하지 않았습니다. 시스템 폰트 Georgia, 바탕, Segoe UI, 맑은 고딕을 사용합니다.

## 지도

- Natural Earth, 1:110m physical land, public domain.
- [Natural Earth](https://www.naturalearthdata.com/)
- [원본 GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson)
- `assets/land.geojson`에서 `scripts/build-assets.cjs`로 `assets/world.js`를 생성합니다. 정방형 도법으로 투영한 개략 지도이며 항해용 지도는 아닙니다. 정치적 국경은 표시하지 않습니다.

## 추천 정보

2026-10-01 확인. 일정 기간·계절과 추천 이유는 이 사이트의 편집 제안입니다.

- [포르투갈 관광청 — 리스본 주변](https://www.visitportugal.com/en/destinos/lisboa-regi%C3%A3o/318533)
- [슬로베니아 관광청 — 류블랴나와 중부 지역](https://www.slovenia.info/en/places-to-go/regions/ljubljana-central-slovenia)
- [노르웨이 관광청 — 베르겐 여행](https://www.visitnorway.com/places-to-go/fjord-norway/bergen/plan-your-trip/)
- [뉴질랜드 관광청 — 남섬 일정](https://www.newzealand.com/nz/trips-and-driving-itineraries/south-island/)

## 이미지

### 실제 여행지 사진

방문 여행지 12곳과 추천 여행지 4곳의 카드·상세·찜 목록에는 Wikimedia Commons의 실제 장소 사진을 사용합니다. 16장 모두 `assets/photos/`에 로컬 파일로 저장하여 오프라인에서도 표시합니다.

- [사진별 원본·저작자·라이선스 목록](photos.html)
- [원본 메타데이터](assets/photos/sources.json)
- 사진은 CC BY-SA 3.0, CC BY-SA 4.0, CC0 등 각 파일에 명시된 조건을 따릅니다. 해당 라이선스는 사진에 적용됩니다.
- Wikimedia가 제공하는 축소본을 사용하며 카드 화면에서 CSS로 일부가 잘려 보일 수 있습니다. 원본 픽셀에 색보정이나 합성은 하지 않았습니다.
- `scripts/fetch-photos.ps1`은 사진과 출처를 수집하고 `scripts/integrate-photos.cjs`는 사이트용 메타데이터와 출처 페이지를 만듭니다. 완성 파일이 포함되어 있어 사이트를 실행할 때 이 스크립트를 실행할 필요는 없습니다.

### 메인 배너와 기본 일러스트

`assets/hero-landscape.png`: 내장 image_gen 도구로 생성한 독창적인 회화풍 풍경. 특정 실제 여행지나 사용자 촬영 사진이 아닙니다. 최종 프롬프트:

> Use case: illustration-story. Asset: ultra-wide panoramic hero artwork for a refined Korean personal travel journal website, no text. Hand-painted oil pastel and gouache on textured linen, literary European travel illustration. Dreamlike but elegant alpine lake landscape: deep forest green wildflower meadow in foreground, small pale-yellow and white flowers, an idyllic ochre and terracotta village with a church spire along the left lake shore, a winding ivory footpath, turquoise muted lake sweeping from center to right, distant slate teal alpine mountains, layered pale sage ridges, hazy creamy pale yellow sky. Low afternoon sun, tranquil nostalgic adventurous atmosphere. Panoramic composition approx 3:1, detailed painterly brushwork, soft edges, sophisticated earthy greens with restrained blue. No people close-up, no writing, no logos, no UI, not photography. Center upper sky open and light. Save as a website illustration.

SVG 여행 엽서 11종과 아이콘은 프로젝트용으로 코드로 제작했습니다. 세부 지형·건축의 정확성을 나타내는 사진이 아닌 장식용 일러스트입니다.
