const History = () => {
  return (
    <div id="history" className="page active pb-24">
           <header className="bg-surface shadow-sm sticky top-0 z-40 flex items-center gap-4 w-full px-4 h-16 border-b border-outline-variant">
                <h1 className="text-xl font-bold text-primary">ประวัติการเคลม</h1>
            </header>
            <main className="p-4 space-y-4">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-3 text-outline">search</span>
                    <input type="text" className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-xl" placeholder="ค้นหาตามชื่อสินค้า..."/>
                </div>
                <div className="bg-white border border-outline-variant p-4 rounded-2xl shadow-sm" onClick={() => setPage("tracking")}>
                    <div className="flex justify-between items-start mb-3">
                        <div className="bg-surface-container-low p-2 rounded-xl text-primary"><span className="material-symbols-outlined">laptop</span></div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">อนุมัติแล้ว</span>
                    </div>
                    <h4 className="font-bold">MacBook Air M2</h4>
                    <p className="text-xs text-on-surface-variant">15 ต.ค. 2566</p>
                    <div className="mt-4 pt-3 border-t border-outline-variant flex justify-between">
                        <span className="font-bold text-primary">฿24,200.00</span>
                        <span className="material-symbols-outlined text-outline">chevron_right</span>
                    </div>
                </div>
            </main>
        </div>
  )
}

export default History