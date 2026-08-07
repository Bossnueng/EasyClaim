const Home = () => {
  return (
    <div>
      
        <div>
          <h2 className="text-2xl font-bold text-on-surface">สวัสดี, คุณสมชาย</h2>
          <p className="text-on-surface-variant">วันนี้คุณต้องการความช่วยเหลือเกี่ยวกับรายการไหนบ้าง?</p>
        </div>
        
        {/* <div className="relative overflow-hidden bg-primary p-6 rounded-2xl shadow-lg text-white">*/}
        <div className="relative bg-primary p-6 rounded-2xl shadow-lg text-white">
          <h3 className="text-xl font-bold mb-1">แจ้งเคลมสินค้าใหม่ได้ทันที</h3>
          <p className="text-sm opacity-80 mb-4">ใช้เวลาเพียงไม่กี่นาที เพื่อเริ่มต้นกระบวนการเคลมสินค้าของคุณ</p>
          <button onClick={() => setPage("new-claim")} 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-secondary-container text-on-secondary-container font-bold rounded-full shadow-sm">
            <span className="material-symbols-outlined">add_circle</span>
                แจ้งเคลมสินค้าใหม่
          </button>
        </div>
                
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">รายการเคลมล่าสุด</h2>
            <button onClick={() => setPage("history")} className="text-sm text-primary font-bold">ดูทั้งหมด</button>
          </div>
          
          <div className="bg-white border border-outline-variant p-4 rounded-2xl flex flex-col gap-3 shadow-sm" onClick={() => setPage("tracking")}>
            <div className="flex justify-between items-center">
              <div className="bg-surface-container-low p-2 rounded-xl text-primary">
                  <span className="material-symbols-outlined">smartphone</span>
              </div>
              <span className="px-3 py-1 bg-secondary-container/20 text-on-secondary-container text-xs rounded-full border border-secondary-container/30">รอการตรวจสอบ</span>
            </div>
          
            <div>
              <h4 className="font-bold">iPhone 15 Pro Max</h4>
              <p className="text-sm text-on-surface-variant">ID: CLM-882910</p>
            </div>
          </div>
        </section>
    </div>
  )
}

export default Home