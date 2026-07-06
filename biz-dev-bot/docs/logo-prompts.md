# Mercury 品牌 Logo 生成词

> 风格：Apple 极简、扁平化、低饱和度灰蓝调、科技感
> 生成工具：MiniMax / Gemini / Midjourney / DALL·E
> 输出格式：建议透明PNG（AI抠图或直接生成），用于网站左上角以及 favicon

---

## 概念一：符号 + 字标（推荐）

> **Prompt：**
> 一个极简的灰蓝色圆形徽标，圆内包含一个抽象的 "M" 形弧线，像水星的行星符号简化版（圆圈顶部加一道纤细弧线）。徽标右侧是 "Mercury" 大写无衬线字体，字重较细，颜色 #7A899C。整体构图水平排列，背景透明。Apple 风格的扁平设计，低饱和度灰蓝色调，干净空旷。
>
> 英文补充：A minimalist flat logo in Apple style. Left: a gray-blue (#7A899C) circle icon with an abstract "M" arc inside, resembling a simplified Mercury symbol. Right: "MERCURY" in thin sans-serif caps, color #7A899C. Clean, generous negative space, low saturation, tech elegance. Transparent background.

## 概念二：纯符号（适合 favicon）

> **Prompt：**
> 一个极简的灰蓝圆形，圆内上方有一道纤细弧线穿过圆的上缘，模仿水星天文符号 (☿) 的极简化演绎。线条粗细一致，颜色 #7A899C，圆形为极浅灰蓝轮廓（2px 线宽）。设计完全扁平无阴影，Apple 风格。背景透明。
>
> 英文补充：Minimalist flat symbol icon in Apple style. A thin gray-blue (#7A899C) circle with a delicate arc crossing the top edge, a simplified Mercury astrological symbol. 2px uniform line weight, no fill, no shadows. Low saturation, clean, transparent background.

## 概念三：字母标 "M"（极简）

> **Prompt：**
> 一个极简的灰蓝大写字母 "M"，但做扁平几何化处理——左侧竖直加粗、右侧竖直加粗，中间两道斜线做细微弧度处理，像两座山。字母下方用一道水平极细线贯穿两端，长度略超出字母宽度。颜色 #7A899C 到 #A8B5C2 渐变。Apple 设计美学，极简干净，无任何装饰，透明背景。
>
> 英文补充：A minimalist flat letter "M" logo in Apple style. Thick vertical legs with two curved diagonal strokes (mountain-like). A thin horizontal line runs beneath the letter, extending slightly past its width. Color gradient #7A899C to #A8B5C2. Ultra-clean, low saturation, transparent background.

## 概念四：组合标（弧形 + 字标）

> **Prompt：**
> 一个灰蓝色纤细弧形（开口朝右），像半张开的括号或月牙，弧线的末端有一个极小的圆形端点。弧形右侧是 "Mercury" 小写无衬线字体，字重 light，颜色 #7A899C。弧形位于文字上方偏左位置，整体呈对角线布局。Apple 风格，极简，低饱和度，透明背景。
>
> 英文补充：Minimalist flat logo. A thin gray-blue arc facing right (crescent-like) with a tiny circular endpoint at its tip. To the right: "Mercury" in light lowercase sans-serif, color #7A899C. Diagonal composition, Apple aesthetic, ultra-clean, transparent background.

## 概念五：速度线标（适合 SaaS 感觉）

> **Prompt：**
> 三道极细的灰蓝色水平平行线，从左到右渐次缩短，形成速度感/信号感。线条最左端对齐，最上方线条最长，最下方最短。线条颜色 #7A899C 到 #C7D0D8 渐变。线条下方右侧是小写 "mercury" 无衬线字体，字重 light。Apple 风格，极简，透明背景。
>
> 英文补充：Minimalist flat logo. Three ultra-thin gray-blue horizontal parallel lines decreasing in length left to right (speed/signal motif). Color gradient #7A899C to #C7D0D8. Below right: "mercury" in light lowercase sans-serif. Apple clean aesthetic, transparent background.

## 概念六：容器标（圆框字母标）

> **Prompt：**
> 一个极细灰蓝色圆环（2px 线宽），圆环内居中放置小写 "m" 字母，字母使用 #7A899C。圆环外右下侧紧跟 "ercury" 小写无衬线字体，字重 light。整体水平排列，Apple 风格，极简，低饱和度，透明背景。
>
> 英文补充：Minimalist flat logo. A thin gray-blue ring (2px) containing lowercase "m" in #7A899C. To its right: "ercury" in light lowercase sans-serif. Apple minimal aesthetic, low saturation, transparent background.

---

## 使用建议

1. **Logo 位置**：替换导航栏左侧蓝色小猫图标，放在侧边栏顶部品牌区
2. **生成后**：将 logo.png 放入 `frontend/public/images/`，我会帮你替换代码中的图标引用
3. **推荐首测**：概念一（符号 + 字标）是最安全的商业选择
4. **配色**：请统一使用 #7A899C 主色、白底或透明底
