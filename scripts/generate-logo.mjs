import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join } from 'path';

const size = 240;

// 创建 SVG logo
const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#334155"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#06b6d4"/>
      <stop offset="100%" style="stop-color:#3b82f6"/>
    </linearGradient>
  </defs>

  <!-- 背景（无圆角） -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>

  <!-- 日历主体 -->
  <rect x="44" y="52" width="152" height="136" rx="16" fill="#ffffff" opacity="0.12"/>
  <rect x="44" y="52" width="152" height="44" rx="16" fill="url(#accent)"/>
  <!-- 修正底部圆角被覆盖 -->
  <rect x="44" y="76" width="152" height="20" fill="url(#accent)"/>

  <!-- 日历顶部装饰孔 -->
  <rect x="78" y="42" width="10" height="22" rx="5" fill="#475569"/>
  <rect x="152" y="42" width="10" height="22" rx="5" fill="#475569"/>

  <!-- 日期网格 - 第一行 -->
  <rect x="60" y="110" width="18" height="18" rx="4" fill="#ffffff" opacity="0.5"/>
  <rect x="84" y="110" width="18" height="18" rx="4" fill="#ffffff" opacity="0.5"/>
  <rect x="108" y="110" width="18" height="18" rx="4" fill="#ffffff" opacity="0.5"/>
  <rect x="132" y="110" width="18" height="18" rx="4" fill="#06b6d4"/>
  <rect x="156" y="110" width="18" height="18" rx="4" fill="#ffffff" opacity="0.5"/>

  <!-- 日期网格 - 第二行 -->
  <rect x="60" y="134" width="18" height="18" rx="4" fill="#ffffff" opacity="0.5"/>
  <rect x="84" y="134" width="18" height="18" rx="4" fill="#3b82f6"/>
  <rect x="108" y="134" width="18" height="18" rx="4" fill="#ffffff" opacity="0.5"/>
  <rect x="132" y="134" width="18" height="18" rx="4" fill="#ffffff" opacity="0.5"/>
  <rect x="156" y="134" width="18" height="18" rx="4" fill="#ffffff" opacity="0.5"/>

  <!-- 日期网格 - 第三行 -->
  <rect x="60" y="158" width="18" height="18" rx="4" fill="#ffffff" opacity="0.3"/>
  <rect x="84" y="158" width="18" height="18" rx="4" fill="#ffffff" opacity="0.3"/>
  <rect x="108" y="158" width="18" height="18" rx="4" fill="#ffffff" opacity="0.3"/>

  <!-- 底部"值班"文字区域 -->
  <rect x="60" y="196" width="120" height="24" rx="12" fill="url(#accent)" opacity="0.2"/>
</svg>
`;

const outputPath = join(process.cwd(), 'public', 'logo.png');

await sharp(Buffer.from(svg))
  .png()
  .toFile(outputPath);

console.log(`Logo saved to ${outputPath}`);
