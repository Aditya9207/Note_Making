import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import axios from "axios";

function SignupPage() {
  const [email, setEmail] = useState("");
  const[Username , setUsername]=useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!email || !password || password !== confirmPassword) {
      alert("Please enter valid details and ensure passwords match");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/api/auth/signup", {
        Username,
        email,
        password,
      });

       // ✅ Store user data in localStorage (or sessionStorage)
       localStorage.setItem("user", JSON.stringify(response.data.user));
       localStorage.setItem("token", response.data.token);



       

      alert("Signup successful! You can now log in.");
      navigate("/Dashboard"); // Redirect to login after signup
    } catch (error) {
      console.error("Signup error:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Signup failed. Try again.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 flex-col md:flex-row">
      <div className="md:w-3/4 w-full flex items-center justify-center">
        <img 
          src="https://cdn.dribbble.com/userupload/8432950/file/original-0c14504bd291054d76548cb015dff89a.png?resize=1024x768&vertical=center" 
          alt="Signup Illustration"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="md:w-1/4 w-full flex flex-col justify-center items-center p-8 bg-white rounded-lg shadow-lg relative">
        <img 
          src="/favicon.png" 
          alt="Notify Logo" 
          className="w-12 h-12 mb-4" 
        />
        <div className="w-full text-center">
          <h1 className="text-5xl font-bold mb-6">Welcome</h1>
          <p className="text-gray-600 mb-8 text-lg">Please enter your details</p>
        </div>
        <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg mb-3 focus:ring-2 focus:ring-gray-500" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="text" placeholder="  Username" className="w-full p-3 border rounded-lg mb-3 focus:ring-2 focus:ring-gray-500" value={Username} onChange={(e) => setUsername(e.target.value)} />
        <div className="w-full relative">
          <input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full p-3 border rounded-lg mb-3 focus:ring-2 focus:ring-gray-500" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="w-full relative">
          <input type={showPassword ? "text" : "password"} placeholder="Confirm Password" className="w-full p-3 border rounded-lg mb-3 focus:ring-2 focus:ring-gray-500" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-4 text-gray-500 text-sm">{showPassword ? "Hide" : "Show"}</button>
        </div>
        <button onClick={handleSignup} className="w-full bg-black text-white p-3 rounded-lg hover:bg-gray-800 transition">Sign Up</button>
        <p className="text-gray-600 text-center mt-3">
       <a href="/" className="text-blue-500">Login</a>
        </p>
      </div>
     
    </div>
  );
}

export default SignupPage;
