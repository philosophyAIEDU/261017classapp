// 화면 주소(라우트) 목록입니다. 새 화면을 만들면 여기에 한 줄 추가하세요.

import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { RequireRole } from './components/RequireRole';
import { LoadingState } from './components/Status';
import Landing from './pages/auth/Landing';
import StudentJoin from './pages/auth/StudentJoin';
import StudentLogin from './pages/auth/StudentLogin';
import AssignmentDetail from './pages/student/AssignmentDetail';
import Assignments from './pages/student/Assignments';
import Home from './pages/student/Home';
import Portfolio from './pages/student/Portfolio';
import Routines from './pages/student/Routines';
import Tutor from './pages/student/Tutor';
import AssignmentReview from './pages/teacher/AssignmentReview';
import CreateClass from './pages/teacher/CreateClass';
import Dashboard from './pages/teacher/Dashboard';
import JoinQR from './pages/teacher/JoinQR';
import ManageAssignments from './pages/teacher/ManageAssignments';
import ManageRoutines from './pages/teacher/ManageRoutines';
import ManageTutors from './pages/teacher/ManageTutors';
import Members from './pages/teacher/Members';
import StudentDetail from './pages/teacher/StudentDetail';
import { useSession } from './store/sessionStore';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/join" element={<StudentJoin />} />
      <Route path="/login" element={<StudentLogin />} />

      <Route element={<AppLayout />}>
        {/* 학생 화면 */}
        <Route path="/home" element={<RequireRole role="student"><Home /></RequireRole>} />
        <Route path="/assignments" element={<RequireRole role="student" module="assignments"><Assignments /></RequireRole>} />
        <Route path="/assignments/:id" element={<RequireRole role="student" module="assignments"><AssignmentDetail /></RequireRole>} />
        <Route path="/routines" element={<RequireRole role="student" module="routines"><Routines /></RequireRole>} />
        <Route path="/tutor" element={<RequireRole role="student" module="tutor"><Tutor /></RequireRole>} />
        <Route path="/portfolio" element={<RequireRole role="student" module="assignments"><Portfolio /></RequireRole>} />

        {/* 교사 화면 */}
        <Route path="/teacher" element={<RequireRole role="teacher"><Dashboard /></RequireRole>} />
        <Route path="/teacher/setup" element={<RequireRole role="teacher"><CreateClass /></RequireRole>} />
        <Route path="/teacher/assignments" element={<RequireRole role="teacher" module="assignments"><ManageAssignments /></RequireRole>} />
        <Route path="/teacher/assignments/:id" element={<RequireRole role="teacher" module="assignments"><AssignmentReview /></RequireRole>} />
        <Route path="/teacher/routines" element={<RequireRole role="teacher" module="routines"><ManageRoutines /></RequireRole>} />
        <Route path="/teacher/tutors" element={<RequireRole role="teacher" module="tutor"><ManageTutors /></RequireRole>} />
        <Route path="/teacher/members" element={<RequireRole role="teacher"><Members /></RequireRole>} />
        <Route path="/teacher/members/:uid" element={<RequireRole role="teacher"><StudentDetail /></RequireRole>} />
        <Route path="/teacher/qr" element={<RequireRole role="teacher"><JoinQR /></RequireRole>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const ready = useSession((s) => s.ready);
  const init = useSession((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  if (!ready) return <LoadingState message="앱을 준비하고 있어요…" />;
  return <AppRoutes />;
}
