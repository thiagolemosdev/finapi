const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

const customers = [];

// Middleware
// Verificar se existe o usuario
function verifiIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({ error: "This customer dont exists!" });
  }

  request.customer = customer;
  return next();
}

// Balaço da conta, verificar o valor disponivel
function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);
  return balance;
}

// Criar a conta do usuario
app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    response.status(400).json({ error: "Custumer already exists!" });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  });
  return response.status(201).send();
});

// Extrato do usuario
app.get("/statement", verifiIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer.statement);
});

// Fazer um deposito
app.post("/deposit", verifiIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };
  customer.statement.push(statementOperation);
  return response.status(201).send();
});

// Fazer um saque
app.post("/withdraw", verifiIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Insuficient founds" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);
  return response.status(201).send();
});

// Extrato por data
app.get("/statement/date", verifiIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return response.json(statement);
});

//Atualizar dados da conta
app.put("/account", verifiIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

// Visualizar dados da conta
app.get("/account", verifiIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.status(201).json({ customer });
});

// Deletar usuario
app.delete("/account", verifiIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(200).json(customers);
});

// Ver saldo da conta
app.get("/balance", verifiIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.status(201).json({ balance: balance });
});

// porta
app.listen(3333);
