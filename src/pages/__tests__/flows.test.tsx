// 컴포넌트 테스트: 과제 제출 → 피드백 카드, 루틴 하루 1회, 학생의 교사 화면 접근 차단
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../App';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';

async function renderAs(role: 'teacher' | 'student', path: string) {
  await useSession.getState().setUser(await repo.demoSignIn!(role));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('화면 흐름', () => {
  it('학생은 교사 화면에 들어갈 수 없다', async () => {
    await renderAs('student', '/teacher');
    expect(await screen.findByText('선생님만 볼 수 있는 화면이에요')).toBeInTheDocument();
    expect(screen.queryByText(/대시보드/)).not.toBeInTheDocument();
  });

  it('과제를 내면 AI 피드백 카드가 보인다', async () => {
    const user = userEvent.setup();
    await renderAs('student', '/assignments/demo-a2'); // 김하늘이 아직 안 낸 논설문 (교사 확인 후 공개)
    // 즉시 공개로 바꿔서 카드가 바로 보이게 합니다
    const a = await repo.getAssignment('demo-class', 'demo-a2');
    await repo.saveAssignment({ ...a!, feedbackRelease: 'instant' });
    useSession.getState().bumpData();

    const box = await screen.findByLabelText('내 글');
    const submit = screen.getByRole('button', { name: /제출하고 AI 피드백 받기/ });
    expect(submit).toBeDisabled(); // 글자 수 부족
    await user.type(box, '나는 학교에서 스마트폰 사용을 제한해야 한다고 생각한다. 왜냐하면 수업 시간에 알림이 오면 집중이 깨지기 때문이다. '.repeat(3));
    await user.click(submit);
    expect(await screen.findByText(/글을 읽고 있어요/)).toBeInTheDocument();
    expect(await screen.findByLabelText('AI 피드백', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText('AI가 작성한 피드백입니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /고쳐 쓰기 \(남은 횟수 2번\)/ })).toBeInTheDocument();
  });

  it('루틴은 하루에 한 번만 인증되고, 다시 하면 수정이 된다', async () => {
    const user = userEvent.setup();
    await renderAs('student', '/routines?id=demo-r1');
    await user.type(await screen.findByLabelText('오늘 한 일'), 'apple, banana');
    await user.click(screen.getByRole('button', { name: '오늘 인증하기' }));
    expect(await screen.findByText('오늘 인증 완료!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '오늘 인증하기' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /오늘 인증 고치기/ }));
    const box = screen.getByLabelText('오늘 한 일');
    await user.clear(box);
    await user.type(box, 'cherry');
    await user.click(screen.getByRole('button', { name: '고친 내용 저장' }));
    await waitFor(() => expect(screen.getByText('오늘 인증 완료!')).toBeInTheDocument());

    const logs = await repo.listRoutineLogs('demo-class', { uid: 'demo-s01', routineId: 'demo-r1' });
    const today = logs.filter((l) => l.text === 'cherry' || l.text === 'apple, banana');
    expect(today).toHaveLength(1);
    expect(today[0].text).toBe('cherry');
  });
});
