// 아이디와 학급 코드를 만듭니다.

// 헷갈리는 글자(0/O, 1/I/L)는 뺐습니다.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function createId(prefix = ''): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${random}`;
}

/** 6자리 학급 코드 (예: 'K7M2QX') */
export function generateClassCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
  }
  return code;
}

/** 학생 로그인용 합성 이메일. 실제 이메일은 받지 않습니다. */
export function studentEmail(classCode: string, studentNo: string): string {
  return `${classCode.trim().toUpperCase()}-${studentNo.trim()}@classapp.local`.toLowerCase();
}

/** 교사가 초기화할 때 주는 임시 비밀번호 (숫자 6자리) */
export function generateTempPassword(random: () => number = Math.random): string {
  let pw = '';
  for (let i = 0; i < 6; i += 1) pw += Math.floor(random() * 10).toString();
  return pw;
}
