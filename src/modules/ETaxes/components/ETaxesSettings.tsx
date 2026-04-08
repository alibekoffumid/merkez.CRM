import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, message, Spin, Typography, Divider } from 'antd';
import { SaveOutlined, ApiOutlined } from '@ant-design/icons';
import { etaxesService } from '../services/etaxesService';
import { ETaxesSettings } from '../types';

const { Title, Text } = Typography;

const ETaxesSettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await etaxesService.getSettings();
      if (data) {
        form.setFieldsValue(data);
      }
    } catch (error) {
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: Partial<ETaxesSettings>) => {
    setSaving(true);
    try {
      await etaxesService.saveSettings(values);
      message.success('Settings saved successfully');
    } catch (error) {
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Spin size="large" /></div>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card 
        className="shadow-md border-0 rounded-xl overflow-hidden"
        title={
          <div className="flex items-center space-x-2 py-2">
            <ApiOutlined className="text-merkez-blue text-xl" />
            <Title level={4} className="!mb-0">Настройки Налоговой Интеграции</Title>
          </div>
        }
      >
        <Text type="secondary" className="block mb-8 px-1">
          Введите параметры, предоставленные вашим оператором фискальных данных (например, Azsmart или NBA). 
          Эти данные необходимы для автоматической регистрации чеков.
        </Text>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
        >
          <Form.Item
            name="api_endpoint"
            label="API Endpoint URL"
            rules={[{ required: true, message: 'Введите URL API' }, { type: 'url', message: 'Введите корректный URL' }]}
          >
            <Input placeholder="https://api.example.com/v1" size="large" />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="merchant_id"
              label="Merchant ID"
              rules={[{ required: true, message: 'Введите ID мерчанта' }]}
            >
              <Input placeholder="M-12345" size="large" />
            </Form.Item>

            <Form.Item
              name="terminal_id"
              label="Terminal ID"
              rules={[{ required: true, message: 'Введите ID терминала' }]}
            >
              <Input placeholder="T-67890" size="large" />
            </Form.Item>
          </div>

          <Form.Item
            name="api_key"
            label="API Key / Token"
            rules={[{ required: true, message: 'Введите API ключ' }]}
          >
            <Input.Password placeholder="••••••••••••••••" size="large" />
          </Form.Item>

          <Divider />

          <div className="flex justify-end">
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />} 
              loading={saving}
              size="large"
              className="bg-merkez-blue hover:bg-blue-600 h-11 px-8 rounded-lg font-medium"
            >
              Сохранить Настройки
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ETaxesSettingsPage;
