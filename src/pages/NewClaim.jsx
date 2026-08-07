import {
  Form,
  Input,
  DatePicker,
  AutoComplete,
  InputNumber,
  Upload,
  Button,
  Card,
  Row,
  Col,
  Select,
  Space
} from "antd";

import {
  UploadOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import { useNavigate } from "react-router-dom";

const { TextArea } = Input;

const productOptions = [
  { value: "Est" },
  { value: "Beer" },
  { value: "100Plus" },
  { value: "Oishi Corn" },
  { value: "Oishi Grape" },
];

const claimType = [
  {
    value: "Packaging",
    label: "บรรจุภัณฑ์เสียหาย",
  },
  {
    value: "Leak",
    label: "สินค้ารั่ว",
  },
  {
    value: "Expired",
    label: "หมดอายุ",
  },
  {
    value: "Quality",
    label: "คุณภาพสินค้า",
  },
  {
    value: "Other",
    label: "อื่น ๆ",
  },
];

const NewClaim = () => {

  const navigate = useNavigate();


  const onFinish = (values)=>{

    const claimData = {

        claimId:
          "CLM-" + Date.now(),

        createdDate:
          dayjs().format("DD/MM/YYYY"),

        reporter:
          "Phonnapha Kaenmueang",

        ...values,

        status:"Processing"

    };


    localStorage.setItem(
      "claimData",
      JSON.stringify(claimData)
    );


    navigate(
      `/claim/processing/${claimData.claimId}`
    );

 };
  

  return (

    <div className="p-6 bg-gray-100 min-h-screen">

      <Card>

        <h1 className="text-3xl font-bold mb-1">
          New Claim
        </h1>

        <p className="text-gray-500 mb-8">
          กรุณากรอกข้อมูลการเคลมสินค้าให้ครบถ้วน
        </p>

        <Form
          layout="vertical"
          onFinish={onFinish}
        >

          <Space
            direction="vertical"
            size={24}
            className="w-full"
          >
                {/* ------------------------- */}
                {/* ข้อมูลผู้แจ้ง */}
                {/* ------------------------- */}

                <Card
                  title="ข้อมูลผู้แจ้ง"
                >

                  <Row gutter={16}>

                    <Col xs={24} md={12}>
                      <Form.Item label="วันที่แจ้ง">

                        <DatePicker
                          className="w-full"
                          defaultValue={dayjs()}
                          disabled
                        />

                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="ผู้แจ้ง">

                        <Input
                          value="Phonnapha Kaenmueang"
                          disabled
                        />

                      </Form.Item>
                    </Col>

                  </Row>

                </Card>

                {/* ------------------------- */}
                {/* ข้อมูลสินค้า */}
                {/* ------------------------- */}

                <Card
                  title="ข้อมูลสินค้า"
                >

                  <Row gutter={16}>

                    <Col xs={24} md={12}>

                      <Form.Item
                        label="ชื่อสินค้า"
                        name="productName"
                        rules={[
                          {
                            required: true,
                            message: "กรุณาเลือกสินค้า",
                          },
                        ]}
                      >

                        <AutoComplete
                          options={productOptions}
                          placeholder="ค้นหาชื่อสินค้า"
                          filterOption={(input, option) =>
                            option.value
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                        />

                      </Form.Item>

                    </Col>

                    <Col xs={24} md={12}>

                      <Form.Item
                        label="Lot Number"
                        name="lot"
                      >

                        <Input
                          placeholder="เช่น LOT240801"
                        />

                      </Form.Item>

                    </Col>

                  </Row>

                  <Row gutter={16}>

                    <Col xs={24} md={12}>

                      <Form.Item
                        label="วันที่ผลิต"
                        name="mfg"
                      >

                        <DatePicker className="w-full"/>

                      </Form.Item>

                    </Col>

                    <Col xs={24} md={12}>

                      <Form.Item
                        label="วันหมดอายุ"
                        name="exp"
                      >

                        <DatePicker className="w-full"/>

                      </Form.Item>

                    </Col>

                  </Row>

                  <Row gutter={16}>

                    <Col xs={24} md={12}>

                      <Form.Item
                        label="จำนวน"
                        name="qty"
                        getValueFromEvent={(e) =>
                          e.target.value.replace(/[^0-9]/g, "")
                        }
                        rules={[
                          {
                            required: true,
                            message: "กรุณาระบุจำนวน",
                          },
                          {
                            pattern: /^[1-9][0-9]*$/,
                            message: "กรุณากรอกจำนวนเต็มที่มากกว่า 0 เท่านั้น",
                          },
                        ]}
                      >
                        <Input
                          placeholder="ระบุจำนวน"
                          maxLength={6}
                          addonAfter="ขวด"
                        />
                      </Form.Item>

                    </Col>

                  </Row>

                </Card>

                {/* ------------------------- */}
                {/* รายละเอียดการเคลม */}
                {/* ------------------------- */}

                <Card
                  title="รายละเอียดการเคลม"
                >
                  
                  {/**
                  <Form.Item
                    label="ประเภทการเคลม"
                    name="claimType"
                  >

                    <Select
                      options={claimType}
                      placeholder="เลือกประเภทการเคลม"
                    />

                  </Form.Item>
                  * 
                  */}


                  <Form.Item
                    label="รายละเอียด"
                    name="detail"
                  >

                    <TextArea
                      rows={6}
                      placeholder="อธิบายอาการเสียหรือรายละเอียดเพิ่มเติม"
                    />

                  </Form.Item>

                </Card>

                {/* ------------------------- */}
                {/* รูปภาพ */}
                {/* ------------------------- */}

                <Card
                  title="รูปภาพประกอบ"
                >

                  <Upload
                    listType="picture-card"
                    beforeUpload={() => false}
                    multiple
                  >

                    <div>

                      <UploadOutlined
                        style={{
                          fontSize: 24,
                        }}
                      />

                      <div className="mt-2">
                        Upload
                      </div>

                    </div>

                  </Upload>

                </Card>

                {/* ------------------------- */}
                {/* Button */}
                {/* ------------------------- */}

                <div className="flex justify-end gap-3">

                  <Button
                    size="large"
                  >
                    บันทึกร่าง
                  </Button>

                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                  >
                    ส่งข้อมูลการเคลม
                  </Button>

                </div>
          </Space>
          
        </Form>

      </Card>

    </div>

  );

};

export default NewClaim;