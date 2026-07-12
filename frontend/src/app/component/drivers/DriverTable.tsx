import DriverRow from "./DriverRow";
import type { Driver } from "../../types";

interface DriverTableProps {
  drivers: Driver[];
  totalCount: number;
  updatingDriverId?: string | null;
  onClearFilters: () => void;
  onSelectDriver?: (driver: Driver) => void;
  onSetAvailability?: (driver: Driver, enabled: boolean) => void;
}

function DriverTable({
  drivers,
  totalCount,
  updatingDriverId = null,
  onClearFilters,
  onSelectDriver,
  onSetAvailability,
}: DriverTableProps) {
  const filteredOut = drivers.length < totalCount;
  return (
    <div className="panel flex flex-1 flex-col gap-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 z-10 border-b border-hairline bg-surface-1 text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="py-2 px-3 font-medium">Mã</th>
              <th className="py-2 pr-3 font-medium">Tài xế</th>
              <th className="py-2 pr-3 font-medium">Biển số</th>
              <th className="py-2 pr-3 font-medium">Khu vực</th>
              <th className="py-2 pr-3 font-medium">EAR</th>
              <th className="py-2 pr-3 font-medium">Trạng thái</th>
              <th className="py-2 pr-3 font-medium">Cờ</th>
              <th className="py-2 pr-3 font-medium">Cảnh báo</th>
              <th className="py-2 pr-3 font-medium">Điện thoại</th>
              <th className="py-2 pl-3 font-medium">Cập nhật</th>
              <th className="py-2 pl-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/50">
            {drivers.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="py-12 text-center text-[12px] text-zinc-500"
                >
                  Không tìm thấy tài xế nào phù hợp
                </td>
              </tr>
            ) : (
              drivers.map((d) => (
                <DriverRow
                  key={d.id}
                  driver={d}
                  isUpdating={updatingDriverId === d.id}
                  onSelect={onSelectDriver}
                  onSetAvailability={onSetAvailability}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-hairline px-4 py-2 text-[10px] text-zinc-500">
        Hiển thị {drivers.length} / {totalCount} tài xế
        {filteredOut && (
          <button
            type="button"
            onClick={onClearFilters}
            className="ml-2 text-emerald-400 hover:text-emerald-300"
          >
            Xoá bộ lọc
          </button>
        )}
      </div>
    </div>
  );
}

export default DriverTable;
