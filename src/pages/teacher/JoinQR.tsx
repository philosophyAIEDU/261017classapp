// 이 화면이 하는 일: 학급 입장 링크와 QR코드를 크게 보여 주고 인쇄합니다. (교실 게시용)
// 고치기 좋은 부분: 인쇄물 안내 문구(STEPS)

import { Check, Copy, Printer, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { BigButton } from '../../components/BigButton';
import { PageHeader } from '../../components/PageHeader';
import { appConfig, terms } from '../../config/appConfig';
import { useSession } from '../../store/sessionStore';

const STEPS = ['휴대폰 카메라로 QR코드를 찍어요.', '번호, 이름, 비밀번호를 써서 가입해요.', `${terms.teacher}이 승인하면 시작!`];

export default function JoinQR() {
  const classRoom = useSession((s) => s.classRoom);
  const [copied, setCopied] = useState(false);
  if (!classRoom) return null;

  const link = `${window.location.origin}/join?code=${classRoom.code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 주소를 복사해 주세요.', link);
    }
  }

  return (
    <div>
      <div className="no-print">
        <PageHeader
          icon={QrCode}
          title="입장 QR"
          description={`${terms.student}들이 QR을 찍으면 가입 화면이 열려요.`}
          action={
            <BigButton icon={Printer} onClick={() => window.print()}>
              인쇄하기
            </BigButton>
          }
        />
      </div>

      <section className="mx-auto max-w-2xl rounded-3xl border-4 border-primary-900 bg-white p-8 text-center shadow-card print:shadow-none sm:p-12">
        <p className="font-bold text-accent-700">{appConfig.organization}</p>
        <h2 className="mt-1 text-3xl font-extrabold text-primary-950 sm:text-4xl">{classRoom.name}에 들어와요!</h2>
        <div className="mx-auto mt-8 inline-block rounded-2xl bg-white p-4 ring-4 ring-accent-300">
          <QRCodeSVG value={link} size={260} level="M" fgColor={appConfig.colors.primary[950]} title={`${classRoom.name} 입장 QR코드`} />
        </div>
        <p className="mt-6 text-lg font-semibold text-muted">학급 코드</p>
        <p className="font-mono text-5xl font-extrabold tracking-[0.25em] text-primary-950">{classRoom.code}</p>
        <ol className="mx-auto mt-8 max-w-md space-y-2 text-left">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-lg">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-900 font-bold text-accent-300">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="mt-6 break-all text-[15px] text-muted">{link}</p>
      </section>

      <div className="no-print mx-auto mt-5 max-w-2xl">
        <BigButton full variant="outline" icon={copied ? Check : Copy} onClick={copy}>
          {copied ? '복사했어요!' : '입장 링크 복사 (메신저로 보내기)'}
        </BigButton>
      </div>
    </div>
  );
}
