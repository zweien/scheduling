// src/lib/avatar.ts

/**
 * 基于用户名生成稳定的 HSL 色相
 * 使用 DJB2 哈希变体算法
 */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

/**
 * 获取用户名首字作为头像显示
 */
export function getAvatarInitial(name: string): string {
  return name.charAt(0);
}
