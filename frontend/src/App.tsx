import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { RequireMe } from "./components/RequireMe";
import { Shell } from "./components/Shell";
import { MeProvider } from "./lib/me";
import AskScreen from "./screens/requester/AskScreen";
import DiscussionNewScreen from "./screens/requester/DiscussionNewScreen";
import RecordScreen from "./screens/requester/RecordScreen";
import AddScreen from "./screens/contributor/AddScreen";
import FollowUpScreen from "./screens/contributor/FollowUpScreen";
import InboxScreen from "./screens/contributor/InboxScreen";
import ReviewScreen from "./screens/contributor/ReviewScreen";
import WhoScreen from "./screens/WhoScreen";

/** All routes. The app shell wraps every route; RequireMe wraps every route except /who. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/ask" replace />} />
      <Route element={<Shell />}>
        <Route path="/who" element={<WhoScreen />} />
        <Route element={<RequireMe />}>
          <Route path="/ask" element={<AskScreen />} />
          <Route path="/discussions/new" element={<DiscussionNewScreen />} />
          <Route path="/records/:recordId" element={<RecordScreen />} />
          <Route path="/add" element={<AddScreen />} />
          <Route path="/add/:infoId" element={<FollowUpScreen />} />
          <Route path="/review/:recordId" element={<ReviewScreen />} />
          <Route path="/inbox" element={<InboxScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/ask" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <MeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </MeProvider>
  );
}
