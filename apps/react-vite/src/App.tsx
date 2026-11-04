import { Add, Notification as NotificationIcon } from '@carbon/icons-react';
import { Cloud } from '@carbon/pictograms-react';
import {
  Button,
  Column,
  Content,
  DataTable,
  DatePicker,
  DatePickerInput,
  Dropdown,
  Grid,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderName,
  InlineNotification,
  MenuItem,
  MenuItemDivider,
  NumberInput,
  OverflowMenu,
  PageHeader,
  PageHeaderContent,
  SidePanel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
  Theme,
  Tile,
  Toggle,
  Toggletip,
  ToggletipButton,
  ToggletipContent,
  TruncatedText,
  UserAvatar,
} from '@carbon/react';
import { useState } from 'react';

const headers = [
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' },
];

const rows = [
  { id: 'a', name: 'Load balancer 1', status: 'Active' },
  { id: 'b', name: 'Load balancer 2', status: 'Disabled' },
];

export function App() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <Theme theme="white">
      <Header aria-label="Carbon next">
        <HeaderName href="#" prefix="Carbon">
          next
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Notifications">
            <NotificationIcon size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
      <Content>
        <PageHeader.Root>
          <PageHeaderContent title="Carbon next test app" />
        </PageHeader.Root>
        <Grid>
          <Column lg={8} md={4} sm={4}>
            <Tile data-testid="tile">
              <Cloud aria-label="Cloud" />
              <TruncatedText
                id="truncated"
                value="Published packages render in a consumer app"
              />
            </Tile>
            <Button
              data-testid="primary-button"
              renderIcon={Add}
              onClick={() => setPanelOpen(true)}>
              Open side panel
            </Button>
            <Tag data-testid="tag" type="blue">
              v12
            </Tag>
            <Toggle data-testid="toggle" id="toggle" labelText="Enable" />
            <TextInput id="name" labelText="Name" />
            <NumberInput id="count" label="Count" min={0} max={10} value={1} />
            <Dropdown
              id="dropdown"
              titleText="Dropdown"
              label="Choose"
              items={['One', 'Two']}
            />
            <DatePicker datePickerType="single">
              <DatePickerInput
                id="date"
                labelText="Date"
                placeholder="mm/dd/yyyy"
              />
            </DatePicker>
            <Toggletip>
              <ToggletipButton label="More information">?</ToggletipButton>
              <ToggletipContent>Toggletip content</ToggletipContent>
            </Toggletip>
            <OverflowMenu label="Actions">
              <MenuItem label="Edit" />
              <MenuItemDivider />
              <MenuItem kind="danger" label="Delete" />
            </OverflowMenu>
            <UserAvatar name="Carbon User" tooltipText="Carbon User" />
            <InlineNotification
              kind="info"
              title="Published build"
              subtitle="Rendered from npm"
            />
          </Column>
          <Column lg={8} md={4} sm={4}>
            <DataTable rows={rows} headers={headers}>
              {({
                rows,
                headers,
                getTableProps,
                getHeaderProps,
                getRowProps,
              }) => (
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => {
                        const { key, ...props } = getHeaderProps({ header });
                        return (
                          <TableHeader key={key} {...props}>
                            {header.header}
                          </TableHeader>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const { key, ...props } = getRowProps({ row });
                      return (
                        <TableRow key={key} {...props}>
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </DataTable>
          </Column>
        </Grid>
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
