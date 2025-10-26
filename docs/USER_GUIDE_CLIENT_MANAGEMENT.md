# Client Management System - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Creating Clients](#creating-clients)
3. [Managing Contact Methods](#managing-contact-methods)
4. [Managing Related Persons](#managing-related-persons)
5. [Managing Special Dates](#managing-special-dates)
6. [Tagging & Organization](#tagging--organization)
7. [Finding Clients](#finding-clients)
8. [Editing Client Information](#editing-client-information)
9. [Best Practices](#best-practices)
10. [FAQ](#faq)

---

## Getting Started

### Accessing the Client Management System

1. Log in to the Momento Cake Admin Dashboard
2. Click on **"Clientes"** in the left sidebar menu
3. Click **"Listagem"** to see all clients

### Understanding Client Types

The system supports two types of clients:

**Pessoa Física (Personal Client)**
- Individual customer
- Fields: Name, Email, CPF, Phone
- For direct customers, friends, family

**Pessoa Jurídica (Business Client)**
- Company or organization
- Fields: Company Name, CNPJ, Representative Info
- For B2B relationships, partnerships, suppliers

---

## Creating Clients

### Step-by-Step: Create a New Personal Client

1. Go to **Clientes** → **Novo Cliente**
2. Select **"Pessoa Física"** (already selected by default)
3. Fill in **Informações Básicas**:
   - **Nome Completo** * (required) - Full name of the person
   - **Email** (optional) - Personal email address
   - **CPF** (optional) - Brazilian ID number (with or without formatting)
   - **Telefone** (optional) - Phone number

4. Add **Métodos de Contato** * (required - at least one):
   - Click **"+ Adicionar"** to add contact methods
   - Select type: Telefone, Email, WhatsApp, Instagram, Facebook, LinkedIn, Outro
   - Enter value (e.g., phone number for Telefone)
   - Check **"Principal"** for preferred contact method
   - You can add multiple contact methods

5. (Optional) Fill **Endereço**:
   - CEP, Estado, Cidade, Bairro
   - Endereço, Número, Complemento

6. (Optional) Add **Tags** for organization:
   - Type a tag name and press Enter, or
   - Click suggested tags to add quickly

7. (Optional) Add **Pessoas Relacionadas** (Related Persons):
   - Click **"Adicionar Pessoa"**
   - Enter: Name (required), Relationship, Birth Date, Email, Phone, Notes
   - Related persons can be linked to special dates (birthdays, anniversaries)

8. (Optional) Add **Datas Especiais** (Special Dates):
   - Click **"Adicionar Data"**
   - Enter: Date, Type (Birthday/Anniversary/Custom)
   - Description and related person (if applicable)
   - Dates appear in countdown order

9. (Optional) Add **Notas Adicionais**:
   - Any additional information about the client

10. Click **"Criar Cliente"** to save

### Step-by-Step: Create a New Business Client

1. Go to **Clientes** → **Novo Cliente**
2. Select **"Pessoa Jurídica"**
3. Fill in **Informações Básicas**:
   - **Razão Social** (required) - Company legal name
   - **Email** (optional) - Company email
   - **CNPJ** (optional) - Company registration number
   - **Telefone** (optional) - Company phone

4. Fill in **Informações Empresariais**:
   - **CNPJ** * (required) - Must be unique
   - **Nome da Empresa** * (required)
   - **Tipo de Negócio** (optional) - Industry/business type
   - **Inscrição Estadual** (optional) - State registration

5. Fill in **Representante** (required for business):
   - **Nome Completo** * (required) - Representative's name
   - **Email** * (required) - Representative's email
   - **Telefone** * (required) - Representative's phone
   - **Cargo** (optional) - Job title/role
   - **CPF** (optional) - Representative's CPF

6. Continue with Contact Methods, Address, Tags, Related Persons, Special Dates, Notes
   (Same as Personal Client)

7. Click **"Criar Cliente"** to save

---

## Managing Contact Methods

### Why Contact Methods?
Multiple ways to reach a client for different situations:
- **Phone**: Quick calls
- **Email**: Formal communication, invoices
- **WhatsApp**: Casual, quick messages
- **Instagram**: Social media engagement
- **Facebook**: Community pages
- **LinkedIn**: B2B communication

### Best Practices for Contact Methods

1. **Always add at least one** - Required by the system
2. **Mark the primary** - Most frequently used contact
3. **Add multiple methods** - Increases reachability
4. **Keep current** - Update when contact methods change
5. **Add notes** - Specify if it's "work" or "personal"

### Example Contact Methods

**Personal Client - João Silva:**
- ☎️ Telefone: (11) 98765-4321 (Principal)
- 📧 Email: joao@email.com
- 💬 WhatsApp: (11) 98765-4321

**Business Client - ABC Ltd:**
- 📧 Email: contato@abc.com.br (Principal)
- ☎️ Telefone: (11) 3456-7890
- 💬 WhatsApp: (11) 98765-0000 (Vendas)

---

## Managing Related Persons

### What Are Related Persons?
Other people connected to the client (family, business partners, family of buyer, etc.)

### Use Cases

1. **Family Members**:
   - Spouse, children, parents
   - Track for personalized service
   - Birthdays for loyalty campaigns

2. **Business Contacts**:
   - Previous representatives
   - Key decision makers
   - Important contacts

3. **Reference Tracking**:
   - How client was referred
   - Important connections
   - Network mapping

### How to Add Related Persons

**Example: Personal Client's Family**
1. Click **"Adicionar Pessoa"** in Related Persons section
2. **Name**: "Maria Silva" (required)
3. **Relationship**: Select from:
   - 👶 Filho(a) - Child
   - 👨‍👩 Pai/Mãe - Parent
   - 👯 Irmão(ã) - Sibling
   - 👫 Cônjuge - Spouse
   - 👤 Amigo(a) - Friend
   - 📌 Outro - Other
4. **Birth Date**: 1990-05-15 (for birthday marketing)
5. **Email & Phone**: Contact information if available
6. **Notes**: "Birthday in May", "Works at XYZ Corp", etc.

**Linking to Special Dates:**
- Add Birthday special date
- Link it to "Maria Silva" (wife)
- System will track and count down to her birthday

---

## Managing Special Dates

### What Are Special Dates?
Important dates for client engagement and personalized marketing.

### Types of Special Dates

1. **🎂 Birthday** - Personal or related person's birthday
2. **💍 Anniversary** - Wedding anniversary, business anniversary
3. **📅 Custom** - Any other important date

### Use Cases

1. **Birthday Marketing**
   - Send personalized offer on client's birthday
   - Track family member birthdays
   - Plan themed campaigns

2. **Business Anniversaries**
   - Client acquisition anniversary
   - Partnership anniversary
   - Company founding date

3. **Special Events**
   - Product launch dates
   - Seasonal promotions
   - Custom reminders

### Smart Countdown System

The system automatically:
- 🎉 Shows "Today!" for today's dates
- 🔔 Shows "Amanhã!" for tomorrow
- ⏰ Shows "Em X dias" for upcoming dates (within 30 days)
- 📅 Sorts by proximity (closest first)

### Example: Birthday Campaign Workflow

1. Create client "João Silva"
2. Add related person: "Maria Silva" (spouse, birthDate: 1990-05-15)
3. Add special date: "Aniversário da Maria", type: Birthday, date: 1990-05-15, link to Maria
4. System shows: "Em 15 dias" (if today is 10 days before)
5. Send Maria an offer before her birthday

---

## Tagging & Organization

### Why Use Tags?

Tags help you:
- **Organize clients** - Group by category
- **Quick filtering** - Find clients quickly
- **Segment for campaigns** - Target specific groups
- **Track status** - VIP, new, inactive clients

### Available Tags

**Status Tags**:
- VIP - High-value customers
- Regular - Regular customers
- Novo Cliente - New customers
- Inativo - Inactive accounts

**Type Tags**:
- Fornecedor - Supplier
- Distribuidor - Distributor

**Sales Channel**:
- Atacado - Wholesale
- Varejo - Retail
- Online - Online sales

**Category**:
- Corporativo - Corporate client
- Resgate - Special promotion/recovery
- Devedora - Outstanding debt
- Em Atraso - Overdue payment

**Custom Tags**:
- You can create your own!
- Just type and press Enter

### How to Tag Clients

1. In the **Tags** section, you'll see suggested tags
2. Click a suggested tag to add it
3. Or type a custom tag and press Enter
4. Remove a tag by clicking the **X** button

### Best Practices

1. **Use consistent tagging** - "VIP" not "VIP Customer"
2. **Limit per client** - 3-5 tags per client is ideal
3. **Regular updates** - Update tags as client status changes
4. **Clear meaning** - Use tags others will understand

---

## Finding Clients

### Quick Search

1. Go to **Clientes** → **Listagem**
2. In the search box, type:
   - **Name**: "João Silva" (partial match works)
   - **Email**: "joao@email" (partial match works)
   - **Phone**: "(11) 98765" (partial match works)
   - **CPF/CNPJ**: Full number usually needed

3. Results appear instantly

### Filtering

1. Use the **Type** dropdown to filter:
   - **Todos** - All clients
   - **Pessoa Física** - Personal clients only
   - **Pessoa Jurídica** - Business clients only

2. Combine search + filter for precise results
   - Example: Search "Silva", Filter "Pessoa Física" = All personal clients named Silva

### Pagination

- List shows 20 clients per page
- Click **"Próxima"** (Next) to see more
- Click **"Anterior"** (Previous) to go back

### Tips for Finding Clients

1. **Start with name** - Most reliable
2. **Try email** - If you have it
3. **Use phone** - For phone-based lookups
4. **Remember filtering** - Reduces results
5. **Check spelling** - Typos affect search

---

## Editing Client Information

### Quick Edit

1. Go to **Clientes** → **Listagem**
2. Find the client (search if needed)
3. Click the client card
4. Click **"Editar"** button
5. Make changes
6. Click **"Atualizar Cliente"**

### What Can Be Edited

✏️ **Always editable**:
- Name
- Email, Phone, CPF/CNPJ
- Address
- Contact Methods (add/remove/edit)
- Related Persons (add/remove/edit)
- Special Dates (add/remove/edit)
- Tags
- Notes

✏️ **Business clients only**:
- Company information (name, CNPJ, type)
- Representative details (name, email, phone, role, CPF)

❌ **Cannot be changed**:
- Client type (Personal ↔ Business requires deletion + recreation)
- Created date (system tracks this)
- Creation user (system tracks this)

### Important Notes When Editing

1. **All required fields still required** - At least 1 contact method, etc.
2. **Unique constraints maintained** - CPF/CNPJ must still be unique
3. **Data is saved immediately** - Click "Atualizar Cliente"
4. **History not tracked** - Changes don't show old values
5. **No reverting** - Use "Atualizar" carefully

---

## Best Practices

### Data Quality

1. **Always complete required fields**:
   - Client name
   - At least one contact method
   - For business: Company name, CNPJ, representative info

2. **Keep data current**:
   - Update contact information when it changes
   - Remove outdated related persons
   - Archive contacts in Related Persons when no longer relevant

3. **Use consistent formatting**:
   - Phone: (11) 98765-4321
   - CPF: 123.456.789-00
   - CNPJ: 12.345.678/0001-90

### Organizational Practices

1. **Tag strategically**:
   - Use status tags (VIP, Regular, Novo)
   - Use type tags (Fornecedor, Distribuidor)
   - Keep tags consistent across team

2. **Track related persons**:
   - Add family for personalization
   - Add key business contacts
   - Link to special dates for reminders

3. **Maintain special dates**:
   - Birthdays for loyalty
   - Anniversaries for B2B
   - Important personal events

### Communication Best Practices

1. **Use primary contact method** - It's marked for a reason
2. **Respect preferences** - If someone prefers WhatsApp, use it
3. **Note special instructions** - "Call after 6pm", "Email only"
4. **Update contact history** - Add notes when contact info fails

---

## FAQ

**Q: Can I change a client from Personal to Business?**
A: No. Delete the personal client and create a new business client with same information.

**Q: What if I accidentally delete a client?**
A: Deleted clients can be restored by administrators. Contact your manager.

**Q: How many contact methods can I add?**
A: Unlimited. Add as many as needed.

**Q: Can I add birthdays for multiple family members?**
A: Yes! Create related persons for each family member, add special dates, and link them.

**Q: What happens if I delete a related person?**
A: The special dates linked to that person still exist, but won't show the person's name.

**Q: Can I bulk import clients?**
A: Not yet. This feature is planned for a future update.

**Q: Why does search return partial matches?**
A: To find clients even if you don't remember exact spelling. Try "Jao" and it finds "João".

**Q: How often should I update client information?**
A: At minimum quarterly. Update immediately when you know information has changed.

**Q: Can I export client data?**
A: Not yet. This feature is planned for a future update. Contact your manager.

**Q: What's the difference between Notes and Related Persons?**
A: Notes = General information about the client. Related Persons = Specific people linked to the client.

**Q: Can multiple staff members edit the same client?**
A: Yes, but changes made by the last person will save. No conflict prevention exists yet.

---

## Getting Help

1. **Forgot how to do something?** - Refer to this guide
2. **System is behaving oddly?** - Try refreshing the page
3. **Still need help?** - Contact your team lead
4. **Found a bug?** - Report it to the development team

---

## Common Workflows

### Workflow 1: New Customer Onboarding
1. Create personal client
2. Add contact methods
3. Add address
4. Tag as "Novo Cliente"
5. Add any known related persons
6. Note special info in notes

### Workflow 2: Birthday Campaign Setup
1. Open customer (existing client)
2. Edit to add related persons (family)
3. Add special dates for birthdays
4. Tag with "Birthday Campaign" (custom)
5. Save
6. Generate list of upcoming birthdays weekly

### Workflow 3: B2B Client Setup
1. Create business client
2. Fill company and representative info
3. Add multiple contact methods
4. Tag as "Corporativo" or "Distribuidor"
5. Add related persons (other key contacts)
6. Note business terms in notes

---

**Last Updated**: 2025-10-25
**Version**: 1.0
**For Questions**: Contact your administrator
