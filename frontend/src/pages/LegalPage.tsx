import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { PageContainer } from "../ui/PageContainer";
import { SectionCard } from "../ui/SectionCard";
import type { LegalPageProps } from "./pageProps";

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
        heading: "O que fica registrado",
        text: "O cadastro pede seu e-mail, apelido e senha. Se você adicionar uma foto, ela aparece no perfil. Também guardamos sua lista de amigos, suas mensagens e os resultados das partidas.",
      },
      {
        heading: "Como usamos essas informações",
        text: "Usamos essas informações para você acessar sua conta, conversar com outras pessoas e consultar perfis e partidas.",
      },
      {
        heading: "Quem pode ver",
        text: "Outros usuários podem ver seu apelido, sua foto e suas estatísticas. As mensagens da sala pública podem ser lidas por quem está conectado. As mensagens privadas ficam visíveis para as pessoas da conversa.",
      },
      {
        heading: "Alterar ou apagar",
        text: "Na página de perfil, você pode mudar o e-mail e o apelido ou remover a foto. No momento, não é possível apagar a conta ou as mensagens pelo aplicativo. Os dados podem ser apagados durante a manutenção do projeto.",
      },
      {
        heading: "Sobre o projeto",
        text: "Este é um projeto acadêmico. Evite compartilhar no chat informações pessoais que não sejam necessárias.",
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
export function LegalPage({ document }: LegalPageProps) {
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
