import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster, toast } from 'sonner'; // For notifications
import { supabase } from './lib/supabaseClient';



// Get Webhook URL from environment variable
const WEBHOOK_URL = process.env.REACT_APP_WEBHOOK_URL;

function App() {
  const [clients, setClients] = useState([]);
  const [allClients, setAllClients] = useState([]); // Store all clients for the alphabetical list
  const [searchTermName, setSearchTermName] = useState('');
  const [searchTermPhone, setSearchTermPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingWebhook, setSendingWebhook] = useState(null); // Track which client's webhook is sending

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Function to fetch clients from Supabase (mocked for now)
  const fetchClients = async () => {
    setLoading(true);
    try {
      // Replace 'template-pesquisa-satisfacao-clientes' with your actual table name if different
      const { data, error } = await supabase.from('template-pesquisa-satisfacao-clientes').select('*');

      if (error) {
        console.error('Error fetching clients:', error);
        toast.error('Erro ao buscar clientes.');
      } else if (data) {
        const sortedData = [...data].sort((a, b) => a.cliente_nome.localeCompare(b.cliente_nome));
        setClients(sortedData);
        setAllClients(sortedData); // Keep a copy of all clients sorted alphabetically
      }
    } catch (err) {
      console.error('Unexpected error fetching clients:', err);
      toast.error('Ocorreu um erro inesperado ao buscar clientes.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle sending data to webhook
  const handleSendWebhook = async (client) => {
    if (!WEBHOOK_URL) {
      toast.error('URL do Webhook não configurada.');
      console.error('Webhook URL is not defined in .env');
      return;
    }
    setSendingWebhook(client.id);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cliente_nome: client.cliente_nome,
          cliente_telefone: client.cliente_telefone,
        }),
      });

      if (response.ok) {
        toast.success(`Dados de ${client.cliente_nome} enviados com sucesso!`);
      } else {
        const errorData = await response.text(); // Read response body for more details
        console.error('Webhook error response:', errorData);
        toast.error(`Erro ao enviar dados para ${client.cliente_nome}. Status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending webhook:', error);
      toast.error(`Erro de rede ao enviar dados para ${client.cliente_nome}.`);
    } finally {
      setSendingWebhook(null); // Reset sending state
    }
  };

  // Filter clients based on search terms (using useMemo for optimization)
  const filteredClients = useMemo(() => {
    return allClients.filter(client => {
      const nameMatch = client.cliente_nome.toLowerCase().includes(searchTermName.toLowerCase());
      const phoneMatch = client.cliente_telefone.includes(searchTermPhone);
      return nameMatch && phoneMatch;
    });
  }, [allClients, searchTermName, searchTermPhone]);

  // Autocomplete suggestions (simple implementation)
  const nameSuggestions = useMemo(() => {
    if (!searchTermName) return [];
    return allClients
      .filter(client => client.cliente_nome.toLowerCase().startsWith(searchTermName.toLowerCase()))
      .map(client => client.cliente_nome)
      .slice(0, 5); // Limit suggestions
  }, [allClients, searchTermName]);

  const phoneSuggestions = useMemo(() => {
    if (!searchTermPhone) return [];
    return allClients
      .filter(client => client.cliente_telefone.startsWith(searchTermPhone))
      .map(client => client.cliente_telefone)
      .slice(0, 5); // Limit suggestions
  }, [allClients, searchTermPhone]);


  return (
    <div className="min-h-screen bg-theme-orange-light p-4 md:p-8 flex flex-col items-center">
      <Toaster richColors position="top-center" />
      <Card className="w-full max-w-4xl bg-white shadow-lg border-theme-orange-medium">
        <CardHeader className="bg-theme-orange-medium text-theme-orange-dark">
          <CardTitle className="text-center text-2xl font-bold">Pesquisa de Satisfação - Clientes</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Search Inputs and Suggestions */}
            <div className="relative">
              <label htmlFor="searchName" className="block text-sm font-medium text-gray-700 mb-1">Buscar por Nome:</label>
              <Input
                id="searchName"
                type="text"
                placeholder="Digite o nome do cliente..."
                value={searchTermName}
                onChange={(e) => setSearchTermName(e.target.value)}
                className="border-theme-orange-medium focus:ring-theme-orange-dark focus:border-theme-orange-dark"
                list="nameSuggestions"
              />
              {nameSuggestions.length > 0 && searchTermName && (
                <datalist id="nameSuggestions">
                  {nameSuggestions.map((name, index) => (
                    <option key={index} value={name} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="relative">
              <label htmlFor="searchPhone" className="block text-sm font-medium text-gray-700 mb-1">Buscar por Telefone:</label>
              <Input
                id="searchPhone"
                type="text"
                placeholder="Digite o telefone..."
                value={searchTermPhone}
                onChange={(e) => setSearchTermPhone(e.target.value)}
                className="border-theme-orange-medium focus:ring-theme-orange-dark focus:border-theme-orange-dark"
                list="phoneSuggestions"
              />
              {phoneSuggestions.length > 0 && searchTermPhone && (
                <datalist id="phoneSuggestions">
                  {phoneSuggestions.map((phone, index) => (
                    <option key={index} value={phone} />
                  ))}
                </datalist>
              )}
            </div>
          </div>

          {/* Client Lists Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Filtered Client List */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4 text-theme-orange-dark">Resultados da Busca:</h2>
              {loading ? (
                <p className="text-center text-gray-500">Carregando clientes...</p>
              ) : filteredClients.length > 0 ? (
                <ScrollArea className="h-[400px] border border-theme-orange-medium rounded-md p-4 bg-orange-50">
                  <ul className="space-y-3">
                    {filteredClients.map((client) => (
                      <li key={client.id} className="flex justify-between items-center p-3 bg-white rounded shadow border border-gray-200">
                        <div>
                          <p className="font-medium text-theme-orange-dark">{client.cliente_nome}</p>
                          <p className="text-sm text-gray-600">{client.cliente_telefone}</p>
                        </div>
                        <Button
                          onClick={() => handleSendWebhook(client)}
                          disabled={sendingWebhook === client.id}
                          variant="outline"
                          size="sm"
                          className="border-theme-orange-medium text-theme-orange-dark hover:bg-theme-orange-medium hover:text-white disabled:opacity-50"
                        >
                          {sendingWebhook === client.id ? 'Enviando...' : 'Enviar Dados'}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-center text-gray-500">Nenhum cliente encontrado com os critérios informados.</p>
              )}
            </div>

            {/* Full Alphabetical Client List */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4 text-theme-orange-dark">Todos os Clientes (A-Z):</h2>
              {loading ? (
                 <p className="text-center text-gray-500">Carregando...</p>
              ) : allClients.length > 0 ? (
                <ScrollArea className="h-[400px] border border-theme-orange-medium rounded-md p-4 bg-orange-50">
                  <ul className="space-y-2">
                    {allClients.map((client) => (
                      <li key={client.id} className="text-sm text-gray-700">
                        {client.cliente_nome} - {client.cliente_telefone}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-center text-gray-500">Nenhum cliente cadastrado.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;

