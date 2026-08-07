import {Table,Tag,Button} from "antd";
import {useNavigate} from "react-router-dom";

const ClaimList=()=>{

    const navigate=useNavigate();

    const claims= JSON.parse(localStorage.getItem("claims")) || [];
    
    const columns=[ { title:"Claim ID", dataIndex:"claimId"},
        {title:"วันที่แจ้ง",dataIndex:"createdDate"},
        {title:"สินค้า",dataIndex:"productName"},
        {title:"จำนวน",dataIndex:"qty",render:(qty)=>`${qty} ขวด`},
        {title:"Status",dataIndex:"status", render:(status)=>( <Tag color="blue">{status}</Tag>)},
        {title:"Action",render:(_,record)=>(<Button onClick={()=> navigate(`/history/${record.claimId}`)}>View</Button>)}
    ];
    
    return(
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold mb-5">Claim History</h1>
            <Table columns={columns} dataSource={claims} rowKey="claimId"/>
        </div>
        )
    }

export default ClaimList;