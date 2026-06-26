import { useEffect, useState } from "react";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import type { AppDispatch, RootState } from "../../store/store";
import { clearAuthError, signupThunk } from "./authSlice";

const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function SignupPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user, status, error } = useAppSelector((s) => s.auth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(signupThunk({ name: name.trim() || undefined, email: email.trim(), password }));
  };

  const disabled = status === "loading";

  return (
    <div className="st-authPage">
      <div className="st-authCard">
        <div className="st-authHeader">
          <h1 className="st-authTitle">Create account</h1>
          <Link className="st-link" to="/">
            Home
          </Link>
        </div>

        <form onSubmit={onSubmit} className="st-authForm">
          <label className="st-authLabel">
            <div>Name</div>
            <input className="st-authInput" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Optional" />
          </label>

          <label className="st-authLabel">
            <div>Email</div>
            <input className="st-authInput" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
          </label>

          <label className="st-authLabel">
            <div>Password</div>
            <input className="st-authInput" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" required />
          </label>

          {error ? <div className="st-authError">{error}</div> : null}

          <button className="st-btn st-btnPrimary" type="submit" disabled={disabled}>
            {disabled ? "Creating..." : "Create account"}
          </button>

          <div className="st-authFooter">
            <span />
            <Link to="/login">Back to login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
