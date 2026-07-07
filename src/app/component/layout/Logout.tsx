import { type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { SignOut, X, Warning } from "@phosphor-icons/react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userRole?: string;
}

export function Logout({
  isOpen,
  onClose,
  userName = "Người dùng",
  userRole = "Nhân viên",
}: LogoutModalProps): ReactElement | null {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogout = () => {
    // Clear auth data
    localStorage.removeItem("sentinel_remember");
    sessionStorage.clear();

    // Navigate to login
    navigate("/login");
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
      style={{ animation: "fadeIn 0.15s ease-out" }}
    >
      {/* Modal */}
      <div
        className="panel w-full max-w-[380px] p-0"
        style={{ animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Warning size={18} weight="duotone" className="text-amber-400" />
            </div>
            <h2 className="text-[14px] font-semibold text-zinc-100">
              Đăng xuất
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-surface-2 hover:text-zinc-300"
            aria-label="Đóng"
          >
            <X size={16} weight="regular" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          {/* User info */}
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-hairline bg-surface-2/40 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-amber-400/20 to-amber-500/5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
              {userName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-medium text-zinc-200">
                {userName}
              </p>
              <p className="truncate text-[11px] text-zinc-500">{userRole}</p>
            </div>
          </div>

          {/* Warning message */}
          <p className="text-[12.5px] leading-relaxed text-zinc-400">
            Bạn có chắc chắn muốn đăng xuất khỏi{" "}
            <span className="font-medium text-zinc-300">Sentinel Fleet</span>?
            Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng hệ thống.
          </p>

          {/* Pending work warning */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2.5">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
              <Warning size={10} weight="bold" className="text-amber-400" />
            </div>
            <p className="text-[11px] leading-relaxed text-amber-300/80">
              Mọi thay đổi chưa lưu sẽ bị mất. Đảm bảo đã lưu công việc trước
              khi đăng xuất.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-hairline px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-hairline bg-transparent py-2.5 text-[13px] font-medium text-zinc-300 transition-all hover:bg-surface-2 hover:border-zinc-600 active:scale-[0.98]"
          >
            Hủy
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-500 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-rose-400 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:ring-offset-2 focus:ring-offset-surface"
          >
            <SignOut size={16} weight="bold" />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
