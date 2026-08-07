import {
  Form,
  Input,
  DatePicker,
  AutoComplete,
  InputNumber,
  Upload,
  Button,
  Card
} from "antd";
import {
  UploadOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

const { TextArea } = Input;

const productOptions = [
  { value: "Pepsi 550 ml" },
  { value: "Pepsi Max 550 ml" },
  { value: "Mirinda Orange" },
  { value: "7UP" },
  { value: "Lipton Lemon Tea" },
];

const NewClaim = () => {

  return (

    <div className="p-6">

      <Card>

        <h1 className="text-2xl font-bold mb-2">
          เคลมสินค้า
        </h1>

        <p className="text-gray-500 mb-6">
          กรุณากรอกรายละเอียดสินค้าให้ครบถ้วน
        </p>

        <Form
          layout="vertical"
        >

          {/* วันที่ */}

          <Form.Item label="วันที่">

            <DatePicker

              className="w-full"

              defaultValue={dayjs()}

              disabled

            />

          </Form.Item>

          {/* ชื่อสินค้า */}

          <Form.Item label="ชื่อสินค้า">

            <AutoComplete

              options={productOptions}

              placeholder="ค้นหาชื่อสินค้า"

              filterOption={(inputValue, option) =>
                option.value
                  .toUpperCase()
                  .includes(inputValue.toUpperCase())
              }

            />

          </Form.Item>

          {/* Lot */}

          <Form.Item label="หมายเลข Lot">

            <Input

              placeholder="เช่น L24080015"

            />

          </Form.Item>

          {/* วันที่ผลิต */}

          <Form.Item label="วันที่ผลิต">

            <DatePicker

              className="w-full"

            />

          </Form.Item>

          {/* วันหมดอายุ */}

          <Form.Item label="วันที่หมดอายุ">

            <DatePicker

              className="w-full"

            />

          </Form.Item>

          {/* จำนวน */}

          <Form.Item label="จำนวน">

            <InputNumber

              min={1}

              addonAfter="ขวด"

              className="w-full"

            />

          </Form.Item>

          {/* รายละเอียด */}

          <Form.Item label="รายละเอียด">

            <TextArea

              rows={5}

              placeholder="กรอกรายละเอียดอาการเสีย"

            />

          </Form.Item>

          {/* Upload */}

          <Form.Item label="รูปภาพประกอบ">

            <Upload

              listType="picture-card"

              beforeUpload={() => false}

            >

              <div>

                <UploadOutlined />

                <div className="mt-2">

                  อัปโหลด

                </div>

              </div>

            </Upload>

          </Form.Item>

          <Button

            type="primary"

            size="large"

            block

          >

            ส่งข้อมูลการเคลม

          </Button>

        </Form>

      </Card>

    </div>

  );

};

export default NewClaim;