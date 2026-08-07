const Chatbox = () => {
  return (
    <div id="chat" className="page active pb-24">
            
            <main className="p-4 space-y-4">
                <div className="flex flex-col gap-4">
                    <div className="self-start bg-surface-container-high text-on-surface p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm">
                        สวัสดีครับ คุณสมชาย มีอะไรให้ช่วยเพิ่มเติมไหมครับ?
                    </div>
                    <div className="self-end bg-primary text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] text-sm">
                        สอบถามเรื่องระยะเวลาการส่งคืนสินค้าครับ
                    </div>
                </div>
                <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-outline-variant flex gap-2">
                <input type="text" className="flex-1 border border-outline-variant rounded-full px-4 py-2" placeholder="พิมพ์ข้อความที่นี่..."/>
                <button className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center"><span className="material-symbols-outlined">send</span></button>
            </div>
            </main>
            
        </div>
  )
}

export default Chatbox