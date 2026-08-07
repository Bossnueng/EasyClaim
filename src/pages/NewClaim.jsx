const NewClaim = () => {
  return (
    <div>
       <header className="bg-surface shadow-sm sticky top-0 z-40 flex items-center gap-4 w-full px-4 h-16 border-b border-outline-variant">
                <span className="material-symbols-outlined cursor-pointer" onClick={() => setPage("dashboard")}>arrow_back</span>
                <h1 className="text-xl font-bold text-primary">เคลมใหม่</h1>
            </header>
      <main className="p-4 space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-1">แบบฟอร์มส่งเคลมสินค้า</h2>
          <p className="text-sm text-on-surface-variant">กรุณาระบุรายละเอียดสินค้าและอาการเสียให้ครบถ้วน</p>
        </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">หมายเลขคำสั่งซื้อ</label>
              <input type="text" className="w-full p-3 border border-outline-variant rounded-xl" placeholder="เช่น ORD-12345"/>
            </div>
          
            <div>
              <label className="block text-sm font-bold mb-2">ชื่อสินค้า</label>
              <input type="text" className="w-full p-3 border border-outline-variant rounded-xl" placeholder="ระบุชื่อรุ่นสินค้า"/>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-primary">รูปภาพประกอบอาการเสีย</label>
              <div className="border-2 border-dashed border-outline-variant p-10 rounded-2xl flex flex-col items-center justify-center bg-surface-container-low">
                <span className="material-symbols-outlined text-4xl text-primary mb-2">cloud_upload</span>
                <p className="text-sm text-on-surface-variant">แตะเพื่ออัปโหลดรูปภาพ</p>
              </div>
            </div>
            <button className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg">ส่งข้อมูลการเคลม</button>
          </div>
      </main>
    </div>
  )
}

export default NewClaim