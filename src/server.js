import app from './app.js';
import 'dotenv/config';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📚 Documentação da API: http://localhost:${PORT}/api-docs`);
});