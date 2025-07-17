import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Login, SignUp } from './pages';


export default function App() {
 return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </BrowserRouter>
  );
}
