# Finish Coach 이미지 제작 기록

모드: 내장 `image_gen` 사용. CLI/API 키 경로는 사용하지 않았다.

스타일 참고: 사용자가 제공한 `Finish Coach 브랜드 디자인 가이드һы.png`. 가이드 전체를 에셋으로 잘라 쓰거나 텍스트를 UI 이미지에 구워 넣지 않고, 개별 에셋을 새로 생성했다.

## 최종 프롬프트 세트

### 공통 버튼 아이콘 프롬프트

> Use case: stylized-concept. Asset type: one production mobile UI icon on transparent background. Reference image: attached Finish Coach brand guide for STYLE ONLY. Subject: [아래 주제]. Match the button icons in the reference: premium soft 3D clay/plastic, softly rounded beveled edges, clean friendly toy-like form, slight 3/4 perspective, consistent diffuse top-left studio light, delicate self shading, limited color palette, readable silhouette at 32px. Center single complete object at 75% of square canvas. Genuine transparent background. NO pastel circle or card behind it, no cast shadow beyond silhouette, no lettering, no labels, no additional objects. Icon must be isolated and fully contained, not a UI mockup.

주제별 개별 호출:

- `today`: A coral red #FF4B4B bullseye target with a short red dart embedded in its white center, concentric red and white rings.
- `routines`: A mint green #10B981 calendar with two rounded binder tabs and a small raised white checkmark on its face, no numbers or text.
- `history`: A blue #3B82F6 circular completion badge with one raised white checkmark and a beveled blue rim.
- `projects`: A violet #8B5CF6 file folder, slightly open with a subtle inner divider, no marks or text.
- `statistics`: A teal #16B8AB bar chart with three rounded ascending columns on a small rounded base, no axes or numbers.
- `settings`: A rose pink #EB5F89 rounded gear with a small white center, simple recognizable cog silhouette.

`*-source.png`는 생성 원본, 각 이름의 `.png`는 192px 배포용 축소본이다. 알파를 보존하며 sips로 리사이즈했고 이미지 내용은 바꾸지 않았다.

### 브랜드 모자

> Use case: stylized-concept. Asset type: production app brand icon, single isolated object. Reference image: attached Finish Coach brand guide, used ONLY as visual/style reference. Create the red coach baseball cap with raised white capital F, like the top-left cap in the reference. Premium soft 3D clay render, coral red #FF4B4B, detailed seam panels, curved brim pointing toward lower-left, 3/4 front view, friendly polished productivity app aesthetic, diffuse top-left studio light, subtle material highlights. One cap only centered and occupying 78% of square canvas, complete brim no clipping, clear silhouette at tiny sizes. Genuine transparent background, no tile, no frame, no drop shadow outside the cap, no extra words or objects. Only text is the white F on the cap.

`coach-cap.png`는 원본, `coach-cap-small.png`는 256px 헤더·스플래시용이다.

### 스토어 / 홈 화면 아이콘

> Use case: logo-brand. Production app icon for Finish Coach. Reference image is the attached brand guide for style and cap design. Square full-bleed opaque very pale white #F8F9FC studio background. One large premium soft 3D coral red #FF4B4B coach baseball cap, white raised capital F on its front, rounded stitched panels, curved brim pointing lower-left, 3/4 front angle exactly like cap in guide. Occupy 70% of square. Subtle soft contact shadow, gentle diffuse top-left light, charming premium clay/plastic rendering. The canvas itself must have square corners with NO baked rounded square frame, no border, no extra text, no logo text beyond F, no app mockup or device. Readable at 48px.

`app-icon.png`는 생성 원본, `app-icon-1024.png`는 정사각 1024px 불투명 앱 아이콘, `favicon.png`는 128px 파비콘이다.

### Android 안전 영역 변형

> Asset preparation edit: Preserve the exact red baseball cap and white F in the input image. Make a square transparent Android adaptive icon foreground. Scale down and center the entire unchanged cap so ALL visible pixels including brim fit within the central 54% width and 54% height of the canvas, with fully transparent equal empty margins on every side. Do not add a background, shadow, text, shape, frame, or any other object. Keep genuine alpha transparency. This empty safe margin is essential for Android circular icon cropping.

생성 원본은 `adaptive-foreground.png`, 정사각 축소본은 `adaptive-foreground-1024.png`에 보관했다. 최종 앱 설정은 아트 내용 변경 없이 원본 모자를 중앙 640px 영역에 배치한 `adaptive-safe-1024.png`를 사용한다. AppKit을 통한 캔버스 크기·여백 정규화로 알파를 보존한다.

### 알림 벨

> Use case: stylized-concept. Asset type: one production mobile UI notification bell icon, isolated on genuinely transparent background. Reference: attached Finish Coach brand design guide for style only. Subject: one golden yellow #F59E0B notification bell with a small rounded clapper and a softly rounded handle at top. Match the guide's yellow bell button: premium soft 3D clay/plastic render, simple chunky silhouette readable at 24px, slight 3/4 perspective, diffuse studio light from upper-left, subtle self shading. Single complete bell centered at 75% of square canvas. No pastel disk, no background shape, no frame, no letters, no other objects or exterior cast shadow.
