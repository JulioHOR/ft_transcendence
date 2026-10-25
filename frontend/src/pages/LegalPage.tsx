import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { PageContainer } from "../ui/PageContainer";
import { SectionCard } from "../ui/SectionCard";

type LegalDocument = {
  title: string;
  sections: { heading: string; text: string }[];
  otherDocument: { label: string; path: string };
};

const legalDocuments: Record<"privacy" | "terms", LegalDocument> = {
  privacy: {
    title: "Política de privacidade",
    sections: [
      {
        heading: "Dados da conta",
        text: "Para criar sua conta, o projeto guarda seu e-mail, apelido e um hash da senha. A foto, as amizades, as mensagens e os resultados do Pong também ficam no banco de dados.",
      },
      {
        heading: "Quem pode ver",
        text: "Usuários conectados podem consultar perfis e estatísticas. As mensagens da sala pública podem ser lidas por todos eles. Mensagens privadas ficam disponíveis às pessoas da conversa.",
      },
      {
        heading: "Senha e acesso",
        text: "A senha não fica guardada em texto. O site e a comunicação com o servidor usam HTTPS. No ambiente local, o certificado pode ser autoassinado.",
      },
      {
        heading: "Sessão",
        text: "Um cookie mantém sua sessão enquanto você está conectado.",
      },
      {
        heading: "Alterar ou apagar dados",
        text: "Na página de perfil, você pode alterar o e-mail e o apelido ou remover a foto. A interface não permite excluir a conta nem as mensagens. Os dados podem ser apagados na limpeza do ambiente de demonstração.",
      },
      {
        heading: "Uso do projeto",
        text: "Este é um projeto acadêmico. Use dados de teste e evite enviar informações pessoais ou confidenciais pelo chat.",
      },
    ],
    otherDocument: { label: "Termos de serviço", path: "/terms" },
  },
  terms: {
    title: "Termos de serviço",
    sections: [
      {
        heading: "Uso da conta",
        text: "Use sua própria conta. Não tente acessar contas de outras pessoas.",
      },
      {
        heading: "Conversas",
        text: "Não use o chat para ameaçar, assediar ou enviar conteúdo ilegal. As mensagens da sala pública podem ser lidas por todos os usuários conectados. As conversas privadas ficam entre seus participantes.",
      },
      {
        heading: "Partidas",
        text: "As partidas, o histórico, os níveis e a classificação são recursos de demonstração. Não há prêmios nem resultados oficiais.",
      },
      {
        heading: "Disponibilidade",
        text: "O projeto pode ficar fora do ar. Os dados de demonstração podem ser apagados durante a manutenção do ambiente.",
      },
    ],
    otherDocument: { label: "Política de privacidade", path: "/privacy" },
  },
};

/** Exibe a política de privacidade ou os termos de serviço. */
export function LegalPage({ document }: { document: "privacy" | "terms" }) {
  const content = legalDocuments[document];
  return (
    <PageContainer>
      <SectionCard sx={{ width: "100%", maxWidth: 800, alignSelf: "center" }}>
        <Stack spacing={2.5}>
          <Typography variant="h2">{content.title}</Typography>
          {content.sections.map((section) => (
            <Stack key={section.heading} spacing={0.5}>
              <Typography variant="h3">{section.heading}</Typography>
              <Typography color="text.secondary">{section.text}</Typography>
            </Stack>
          ))}
          <Link component={RouterLink} to={content.otherDocument.path}>
            {content.otherDocument.label}
          </Link>
        </Stack>
      </SectionCard>
    </PageContainer>
  );
}
