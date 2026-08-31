Build a ready-to-deploy PoC REST API with NestJS and TypeScript. Requirements:

1.  no database for now
2.  the dummy response data for each endpoint should be stored in an individual file as follows:

- suppliers file with 50 dummy data generated items following the shape of this supplier object:
  {
  "id": "sup_123",
  "name": "Example Supplier GmbH",
  "country": {
  "code": "DE",
  "name": "Germany"
  },
  "industry": "Manufacturing",
  "relationship": {
  "status": "active",
  "tier": 1
  },
  "risk": {
  "score": 82,
  "level": "high"
  },
  "assessment": {
  "status": "completed",
  "score": 84,
  "lastCompletedAt": "2026-07-12T09:30:00Z"
  },
  "updatedAt": "2026-08-30T14:00:00Z"
  }

- supplier file with an object whose 50 keys are the ids of each supplier from the suppliers file and the value is a nested object following the shape:
  {
  "sup_123": {
  "id": "sup_123",
  "identity": {
  "name": "Example Supplier GmbH",
  "legalName": "Example Supplier GmbH",
  "identifiers": {
  "vatNumber": "DE123456789",
  "lei": "529900EXAMPLE123456",
  "duns": "123456789"
  }
  },
  "address": {
  "street": "Hauptstraße 123",
  "city": "Munich",
  "postalCode": "80331",
  "country": {
  "code": "DE",
  "name": "Germany"
  }
  },
  "contact": {
  "email": "contact@example-supplier.com",
  "phone": "+49 89 123456",
  "website": "https://example-supplier.com"
  },
  "company": {
  "industry": "Manufacturing",
  "employeeCount": 250,
  "foundedYear": 1998
  },
  "relationship": {
  "status": "active",
  "tier": 1,
  "since": "2024-01-01",
  "procurement": {
  "category": "Raw Materials",
  "annualSpend": {
  "amount": 1250000,
  "currency": "EUR"
  }
  }
  },
  "risk": {
  "score": 82,
  "level": "high",
  "lastCalculatedAt": "2026-08-30T14:00:00Z"
  },
  "assessment": {
  "status": "completed",
  "score": 84,
  "lastCompletedAt": "2026-07-12T09:30:00Z",
  "expiresAt": "2027-07-12T00:00:00Z"
  },
  "documents": {
  "total": 12,
  "valid": 10,
  "expiringSoon": 2,
  "expired": 0
  },
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2026-08-30T14:00:00Z"
  }
  }

3.  supports only the read CRUD operation
4.  instantiate a git repository called “intNext” in Desktop/code and create the server project in a new directory called “int-server” in in Desktop/code/intNext
5.  expose the following endpoints delivering the data from the two files suppliers and supplier:
    - GET /api/v1/suppliers
    - GET /api/v1/suppliers/{supplierId}
6.  move this md file to the intNext directory and call it “server-requirements”
7.  add as first commit the markdown file containing these requirements
8.  add as second commit the code you generated from these requirements
9.  write necessary tests
10. OpenAPI should be supported and swagger documentation generated similar to the one here: https://jean-test-api.herokuapp.com/api-docs/index.html
11. even though the server does not have a database, create search and filter functionality by reading the files where the dummy data is saved and returning the individual supplier if there is any found:

GET /api/v1/suppliers?
search=example&
country=DE&
status=active&
riskLevel=high&
page=1&
limit=10

Response:

{
"data": [
{
"id": "sup_123",
"name": "Example Supplier GmbH",
"country": "DE",
"status": "active",
"risk": {
"level": "high",
"score": 78
}
}
],
"pagination": {
"page": 1,
"limit": 8,
"total": 50,
"hasNext": true
}
}

12. Each client API request must include an HTTP header named `X-SESSION`. The value of this header should be a token stored as a secret or variable.
13. the server should be deployed to Render, so prepare app for this step
14. except the missing database, please consider best practices and suggest improvements for this PoC in a separate markdown file named "improvements.md" stored in the Desktop/code/intNext/int-server directory
