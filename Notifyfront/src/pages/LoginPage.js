import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import axios from "axios";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // ❗ Inline error message

  const navigate = useNavigate();

  const handleLogin = async () => {
    setErrorMessage(""); // Clear previous errors

    if (!email || !password) {
      setErrorMessage("Please enter valid credentials.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", response.data.token);
      // alert("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Login failed. Try again.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 flex-col md:flex-row">
      <div className="md:w-3/4 w-full flex items-center justify-center">
        <img 
          src="https://cdn.dribbble.com/userupload/8432950/file/original-0c14504bd291054d76548cb015dff89a.png?resize=1024x768&vertical=center" 
          alt="Login Illustration"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="md:w-1/4 w-full flex flex-col justify-center items-center p-8 bg-white rounded-lg shadow-lg relative">
        <img 
          src="/favicon.png" 
          alt="Notify Logo" 
          className="w-12 h-12 mb-6" 
        />
        <div className="w-full text-center">
          <h1 className="text-5xl font-bold mb-6">Welcome</h1>
          <p className="text-gray-600 mb-8 text-lg">Please enter your details</p>
        </div>
        <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg mb-3 focus:ring-2 focus:ring-gray-500" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="w-full relative">
          <input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full p-3 border rounded-lg mb-3 focus:ring-2 focus:ring-gray-500" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-4 text-gray-500 text-sm">{showPassword ? "Hide" : "Show"}</button>
        </div>
        <button onClick={handleLogin} className="w-full bg-black text-white p-3 rounded-lg hover:bg-gray-800 transition">Log In</button>
        
        <button className="w-full flex items-center justify-center border p-3 rounded-lg mt-3 hover:bg-gray-100 transition">
          <FcGoogle className="mr-2" /> Log in with Google
        </button>

        {/* ✅ Add Signup Link Here */}
        <p className="text-gray-600 text-center mt-3">
          Don't have an account? <a href="/signup" className="text-blue-500">Sign Up</a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
