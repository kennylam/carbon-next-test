'use client';

import { Add } from '@carbon/icons-react';
import {
  Button,
  Column,
  Content,
  Grid,
  Header,
  HeaderName,
  InlineNotification,
  Modal,
  PageHeader,
  PageHeaderContent,
  SidePanel,
  Tag,
  TextInput,
  Theme,
  Tile,
  Toggle,
  Tooltip,
  UserAvatar,
  useFeatureFlag,
} from '@carbon/react';
import { useState } from 'react';

export function Showcase({ renderedAt }: { renderedAt: string }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const v12 = useFeatureFlag('enable-v12-release');

  return (
    <Theme theme="g10">
      <Header aria-label="Carbon next">
        <HeaderName href="#" prefix="Carbon">
          next
        </HeaderName>
      </Header>
      <Content>
        <PageHeader.Root>
          <PageHeaderContent title="Carbon next test app" />
        </PageHeader.Root>
        <Grid>
          <Column lg={16} md={8} sm={4}>
            <Tile data-testid="tile">
              <p data-testid="render-info">
                rendered-at:{renderedAt} v12:{String(v12)}
              </p>
            </Tile>
            <Button
              data-testid="primary-button"
              renderIcon={Add}
              onClick={() => setPanelOpen(true)}>
              Open side panel
            </Button>
            <Tag data-testid="tag" type="green">
              v12
            </Tag>
            <Toggle data-testid="toggle" id="toggle" labelText="Enable" />
            <TextInput id="name" labelText="Name" />
            <Tooltip label="Tooltip content">
              <button type="button">Tooltip trigger</button>
            </Tooltip>
            <UserAvatar name="Carbon User" tooltipText="Carbon User" />
            <InlineNotification
              kind="success"
              title="Server rendered"
              subtitle="Hydrated on the client"
            />
          </Column>
        </Grid>
        <Modal open={false} modalHeading="Closed modal" passiveModal>
          Modal content
        </Modal>
        <SidePanel
          open={panelOpen}
          onRequestClose={() => setPanelOpen(false)}
          size="md"
          title="Side panel">
          Side panel content
        </SidePanel>
      </Content>
    </Theme>
  );
}
