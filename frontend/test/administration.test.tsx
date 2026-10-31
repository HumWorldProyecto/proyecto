import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Administration } from '../src/components/Administration';
import { adminRequest } from '../src/services/api';
import { geography } from './fixtures';

const ok = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => structuredClone(data) }) as Response;
let channels: {id:string;name:string;sources:{id:string;url:string;active:boolean}[]}[];
let preview: {retentionDays:number|null;cutoff:string|null;expiredCount:number;totalCount:number};
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  channels=[]; preview={retentionDays:7,cutoff:'2026-10-24T12:00:00Z',expiredCount:1,totalCount:3};
  fetcher=vi.fn(async(url:string,options?:RequestInit)=>{
    const method=options?.method??'GET'; const body=options?.body ? JSON.parse(String(options.body)) : {};
    if(url.endsWith('/news/purge-preview'))return ok(preview);
    if(url.endsWith('/config/retention')){
      preview={...preview,retentionDays:body.retentionDays,cutoff:body.retentionDays===null?null:'2026-10-24T12:00:00Z',expiredCount:body.retentionDays===null?0:1};return ok({retentionDays:body.retentionDays});
    }
    if(url.endsWith('/news/purge')){preview={...preview,expiredCount:0,totalCount:2};return ok({deletedCount:1});}
    if(url.endsWith('/channels')){
      if(method==='POST'){channels.push({id:'c1',name:body.name,sources:[]});return ok(channels[0],201);}return ok(channels);
    }
    if(url.endsWith('/sources/s1')){
      channels[0].sources=method==='PUT' ? [{id:'s1',url:geography.sources[0].url,active:true}] : [];
      return ok(channels[0]);
    }
    if(method==='PUT'){channels[0].name=body.name;return ok(channels[0]);}
    if(method==='DELETE'){channels=[];return ok(undefined,204);}
    return ok({});
  });
  vi.stubGlobal('fetch',fetcher);
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

it('CRUD de medios, asociación y desvinculación conservan fuentes; eliminar exige confirmación',async()=>{
  const changed=vi.fn();const user=userEvent.setup();
  render(<Administration credential={crypto.randomUUID()} sources={geography.sources} onChanged={changed}/>);
  await screen.findByText('No hay medios registrados.');
  await user.type(screen.getByLabelText('Nombre del nuevo medio'),'Medio');
  await user.click(screen.getByRole('button',{name:'Crear medio'}));
  let row=await screen.findByRole('article',{name:'Medio Medio'});
  const name=within(row).getByLabelText('Nombre de Medio');await user.clear(name);await user.type(name,'Renombrado');
  await user.click(within(row).getByRole('button',{name:'Renombrar medio'}));
  row=await screen.findByRole('article',{name:'Medio Renombrado'});
  await user.selectOptions(within(row).getByLabelText('Fuente para Renombrado'),'s1');
  await user.click(within(row).getByRole('button',{name:'Asociar fuente'}));
  await screen.findByRole('button',{name:'Desvincular fuente'});
  await user.click(screen.getByRole('button',{name:'Desvincular fuente'}));
  await screen.findByText('Sin fuentes asociadas.');
  const confirm=vi.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  await user.click(screen.getByRole('button',{name:'Eliminar medio'}));
  expect(screen.getByRole('article',{name:'Medio Renombrado'})).toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'Eliminar medio'}));
  await screen.findByText('No hay medios registrados.');expect(confirm).toHaveBeenCalledTimes(2);
  expect(changed).toHaveBeenCalledTimes(5);
});

it('configura/desactiva caducidad y cancela/confirma purga usando el periodo de preview',async()=>{
  const changed=vi.fn();const user=userEvent.setup();
  render(<Administration credential={crypto.randomUUID()} sources={[]} onChanged={changed}/>);
  const input=await screen.findByLabelText('Días de permanencia');
  await waitFor(()=>expect(input).toHaveValue(7));
  fireEvent.change(input,{target:{value:'14'}});await user.click(screen.getByRole('button',{name:'Guardar caducidad'}));
  await screen.findByText('Periodo de caducidad guardado');
  await waitFor(()=>expect(input).toHaveValue(14));
  fireEvent.change(input,{target:{value:''}});await user.click(screen.getByRole('button',{name:'Guardar caducidad'}));
  await screen.findByText('Caducidad desactivada');
  await waitFor(()=>expect(input).toHaveValue(null));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar caducidad'})).not.toBeDisabled());
  expect(screen.getByRole('button',{name:'Purgar noticias caducadas'})).toBeDisabled();
  fireEvent.change(input,{target:{value:'7'}});await user.click(screen.getByRole('button',{name:'Guardar caducidad'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Purgar noticias caducadas'})).not.toBeDisabled());
  vi.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  await user.click(screen.getByRole('button',{name:'Purgar noticias caducadas'}));
  expect(fetcher.mock.calls.filter(([url])=>url.endsWith('/news/purge'))).toHaveLength(0);
  await user.click(screen.getByRole('button',{name:'Purgar noticias caducadas'}));
  await screen.findByText('Se eliminaron 1 noticias caducadas');
  const request=fetcher.mock.calls.find(([url])=>url.endsWith('/news/purge'))!;
  expect(JSON.parse(request[1].body)).toEqual({expectedRetentionDays:7});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Purgar noticias caducadas'})).toBeDisabled());
  await user.click(screen.getByRole('button',{name:'Actualizar vista previa'}));
});

it('permite reintentar lecturas y muestra conflicto sin ocultar la política',async()=>{
  const original=fetcher.getMockImplementation()! as (url:string,options?:RequestInit)=>Promise<Response>;
  let fail=true;
  fetcher.mockImplementation((url:string,options?:RequestInit)=>fail?Promise.resolve(ok({},503)):original(url,options));
  const user=userEvent.setup();render(<Administration credential={crypto.randomUUID()} sources={[]} onChanged={vi.fn()}/>);
  await screen.findByRole('button',{name:'Reintentar medios'});fail=false;
  await user.click(screen.getByRole('button',{name:'Reintentar medios'}));
  await user.click(screen.getByRole('button',{name:'Reintentar caducidad'}));
  await screen.findByText('No hay medios registrados.');
  await waitFor(()=>expect(screen.getByRole('button',{name:'Purgar noticias caducadas'})).not.toBeDisabled());
  fetcher.mockImplementation((url:string,options?:RequestInit)=>url.endsWith('/news/purge')?Promise.resolve(ok({},409)):original(url,options));
  vi.spyOn(window,'confirm').mockReturnValue(true);
  await user.click(screen.getByRole('button',{name:'Purgar noticias caducadas'}));
  await screen.findByText('La configuración cambió o hay una operación en curso. Actualiza la vista previa.');
});

it('operación pendiente se aborta al retirar la vista; fallo no Error se sanitiza',async()=>{
  const user=userEvent.setup();const changed=vi.fn();
  const view=render(<Administration credential={crypto.randomUUID()} sources={[]} onChanged={changed}/>);
  await screen.findByText('No hay medios registrados.');
  await user.type(screen.getByLabelText('Nombre del nuevo medio'),'Fallo');
  fetcher.mockRejectedValueOnce('detalle no Error');
  await user.click(screen.getByRole('button',{name:'Crear medio'}));
  await screen.findByText('No se pudo completar la operación');
  let resolve!:(value:Response)=>void;let signal:AbortSignal;
  fetcher.mockImplementationOnce((_url:string,options:RequestInit)=>{signal=options.signal as AbortSignal;return new Promise<Response>(r=>{resolve=r;});});
  await user.click(screen.getByRole('button',{name:'Crear medio'}));view.unmount();
  expect(signal!.aborted).toBe(true);resolve(ok({}));await Promise.resolve();expect(changed).not.toHaveBeenCalled();
});

it.each([400,404,409])('cliente administrativo comunica error %s sin reproducir detalles',async(status)=>{
  fetcher.mockResolvedValue(ok({},status));
  await expect(adminRequest('/channels','',new AbortController().signal)).rejects.toThrow(status===400?'datos introducidos':status===404?'ya no existe':'configuración cambió');
});
